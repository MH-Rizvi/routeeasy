
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from typing import Any, Dict, List

from langchain.agents import AgentExecutor, create_react_agent  # pyright: ignore[reportMissingImports]
from langchain.prompts import PromptTemplate  # pyright: ignore[reportMissingImports]

from app.agent.output_parser import RouteEasyOutputParser

from app.agent.callbacks import LLMOpsCallbackHandler
from app.agent.prompts import SYSTEM_PROMPT_v1
from app.agent.tools import (
    geocode_stop_tool,
    search_saved_stops_tool,
    search_saved_trips_tool,
    get_trip_by_id_tool,
    get_recent_history_tool,
    save_trip_tool,
)
from app.services import directions_service
from app.services.groq_client import groq_rotator, _is_rate_limit_error


logger = logging.getLogger(__name__)


_tools = [
    geocode_stop_tool,
    search_saved_stops_tool,
    search_saved_trips_tool,
    get_trip_by_id_tool,
    get_recent_history_tool,
    save_trip_tool,
]

_prompt = PromptTemplate(
    template=SYSTEM_PROMPT_v1,
    input_variables=["input", "chat_history", "agent_scratchpad", "tools", "tool_names", "user_context"],
)

# Ordered by reliability/capacity — less popular models first to reduce rate-limit hits.
# The last-successful model index is remembered ("sticky") across requests.
GROQ_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "moonshotai/kimi-k2-instruct",
    "llama-3.3-70b-versatile",
]
_current_model_idx = 0  # sticky: remembers last successful model


def _build_executor() -> AgentExecutor:
    """Build a fresh AgentExecutor using the current rotator key."""
    if groq_rotator.current_provider == "groq":
        model_name = GROQ_MODELS[_current_model_idx]
    else:
        model_name = "gemini-2.0-flash-lite"

    llm = groq_rotator.get_chat_groq(model=model_name, temperature=0)
    agent = create_react_agent(llm, _tools, _prompt, output_parser=RouteEasyOutputParser())
    return AgentExecutor(
        agent=agent,
        tools=_tools,
        verbose=True,
        max_iterations=20,
        handle_parsing_errors=True,
        callbacks=[LLMOpsCallbackHandler()],
        return_intermediate_steps=True,
    )


# Initial executor — will be rebuilt on key rotation
_agent_executor = _build_executor()


def _format_history(raw_history: List[Any]) -> str:
    """
    Format raw conversation history into a readable string.
    Handles both plain dicts and Pydantic model objects.
    """
    lines: List[str] = []
    for msg in raw_history:
        if isinstance(msg, dict):
            role = msg.get("role")
            content = msg.get("content", "")
        else:
            role = getattr(msg, "role", None)
            content = getattr(msg, "content", "")
        if role == "user":
            prefix = "Driver"
        elif role == "assistant":
            prefix = "Assistant"
        else:
            prefix = "Other"
        lines.append(f"{prefix}: {content}")
    return "\n".join(lines)


def _extract_stops_from_steps(intermediate_steps: list) -> List[Dict[str, Any]]:
    """
    Extract geocoded stops from the agent's intermediate tool calls.

    CRITICAL FIX: The agent may retry geocoding with a refined query
    (e.g., "Westbury, NY" → "Westbury, Long Island, NY"). 
    
    We track stops by their POSITION in the geocoding sequence, not by label.
    The agent geocodes in order: first call = position 0, second = position 1, etc.
    When retrying, we overwrite the previous result for that position.
    
    To detect retries without explicit signals, we use label similarity:
    if a new geocode's label is similar to a recent one, it's a retry.
    """
    import json as _json

    # Track geocoded stops by position (0, 1, 2...)
    # Each position holds the LATEST result for that stop
    stops_by_position: Dict[int, Dict[str, Any]] = {}
    current_position = 0
    
    # Track trip stops loaded from get_trip_by_id
    trip_stops: List[Dict[str, Any]] = []
    
    # Track recent geocode labels to detect retries
    recent_labels: List[str] = []  # [(position, label_lower), ...]

    for action, observation in intermediate_steps:
        if action.tool == "get_trip_by_id" and isinstance(observation, dict) and "stops" in observation:
            for s in observation.get("stops", []):
                trip_stops.append({
                    "label": s.get("label"),
                    "resolved": s.get("resolved"),
                    "lat": s.get("lat"),
                    "lng": s.get("lng"),
                    "note": s.get("note"),
                })
        elif action.tool == "geocode_stop" and isinstance(observation, dict):
            if observation.get("success"):
                # Extract clean label
                raw_input = action.tool_input if isinstance(action.tool_input, str) else str(action.tool_input)
                label = raw_input
                if raw_input.strip().startswith("{"):
                    try:
                        label = _json.loads(raw_input).get("query", raw_input)
                    except (ValueError, _json.JSONDecodeError):
                        pass
                
                label_clean = label.strip()
                label_lower = label_clean.lower()

                # Check if this looks like a retry for a recent position
                # Heuristic: if label shares significant words with a recent label
                is_retry = False
                retry_position = -1
                
                label_words = set(label_lower.replace(",", "").split())
                
                # Check recent labels (last 3) for similarity
                for pos, recent_label in reversed(recent_labels[-3:]):
                    recent_words = set(recent_label.replace(",", "").split())
                    common = label_words & recent_words
                    # Retry if: 2+ words match, or one label contains the other
                    if len(common) >= 2 or label_lower in recent_label or recent_label in label_lower:
                        is_retry = True
                        retry_position = pos
                        break

                if is_retry and retry_position >= 0:
                    # Overwrite the previous result for this position
                    stops_by_position[retry_position] = {
                        "label": label_clean,
                        "resolved": observation.get("formatted_address", ""),
                        "lat": observation.get("lat"),
                        "lng": observation.get("lng"),
                        "note": None,
                    }
                    # Update the label for this position
                    recent_labels = [(p, l) for p, l in recent_labels if p != retry_position]
                    recent_labels.append((retry_position, label_lower))
                else:
                    # New stop position
                    stops_by_position[current_position] = {
                        "label": label_clean,
                        "resolved": observation.get("formatted_address", ""),
                        "lat": observation.get("lat"),
                        "lng": observation.get("lng"),
                        "note": None,
                    }
                    recent_labels.append((current_position, label_lower))
                    current_position += 1

    # Build final list in position order
    geocoded_stops = [stops_by_position[pos] for pos in sorted(stops_by_position.keys())]

    # Merge: trip stops first, then geocoded stops, with correct positions
    merged = trip_stops + geocoded_stops
    return [{**stop, "position": i} for i, stop in enumerate(merged)]


# Regex: matches lines like "1. Label (40.123, -73.456) - Address text"
_STOP_RE = re.compile(
    r'^\s*\d+\.\s+'               # "1. "
    r'(.+?)\s*'                    # label (non-greedy)
    r'\((-?\d+\.?\d*),\s*'         # (lat,
    r'(-?\d+\.?\d*)\)\s*'          # lng)
    r'(?:-\s*(.+))?$',             # optional "- address"
    re.MULTILINE,
)


def _extract_stops_from_reply(reply: str) -> List[Dict[str, Any]]:
    """
    Fallback: parse stops from the agent's text reply.
    Looks for numbered lines containing (lat, lng) coordinates.
    Returns an empty list if the reply doesn't contain route data.
    """
    matches = _STOP_RE.findall(reply)
    if len(matches) < 2:          # Need at least 2 stops for a route
        return []

    stops: List[Dict[str, Any]] = []
    for i, (label, lat_str, lng_str, address) in enumerate(matches):
        stops.append({
            "label": label.strip(),
            "resolved": address.strip() if address else label.strip(),
            "lat": float(lat_str),
            "lng": float(lng_str),
            "note": None,
            "position": i,
        })
    return stops


def _hide_coordinates_from_reply(reply: str) -> str:
    """Removes coordinate pairs like (40.7668, -73.5272) from the reply text."""
    # Matches (lat, lng) including the parentheses and surrounding whitespace
    return re.sub(r'\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*', ' ', reply).strip()


_processing_messages = set()

async def run_agent(
    message: str,
    conversation_history: List[Dict[str, Any]] | None = None,
    db: Any | None = None,
    user_id: str | None = None,
    user_city: str | None = None,
) -> Dict[str, Any]:
    global _processing_messages
    msg_hash = hashlib.md5(message.encode("utf-8")).hexdigest()
    if msg_hash in _processing_messages:
        logger.warning("Duplicate request detected for hash %s. Skipping.", msg_hash)
        return {
            "reply": "I am already processing that request. Please wait a moment...",
            "stops": []
        }
        
    _processing_messages.add(msg_hash)
    try:
        return await _run_agent_internal(message, conversation_history, db, user_id, user_city)
    finally:
        _processing_messages.discard(msg_hash)


def _build_user_context_string(db: Any, user_id: str, user_city: str) -> str:
    """Fetches real-time user profile, saved trips, and stats to inject into LLM prompt."""
    if not db or not user_id:
        return "You are talking to a guest driver. Their default city is Hicksville, NY."

    from app.models import UserProfile, Trip, TripHistory
    import json
    
    # 1. Profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    first_name = profile.first_name if profile and profile.first_name else "Driver"
    
    # 2. Saved Trips
    trips = db.query(Trip).filter(Trip.user_id == user_id).all()
    trip_count = len(trips)
    trip_names = ", ".join([f"'{t.name}'" for t in trips]) if trips else "none"

    # 3. Recent History & Stats
    histories = db.query(TripHistory).filter(TripHistory.user_id == user_id).order_by(TripHistory.launched_at.desc()).all()
    
    total_trips = len(histories)
    total_miles = round(sum(h.total_miles or 0.0 for h in histories), 1)
    
    recent_3 = histories[:3]
    if recent_3:
        recent_str = "\n".join([f"- {h.launched_at.strftime('%Y-%m-%d')}: {h.trip_name or 'Unsaved Route'} ({int(len(json.loads(h.stops_json)))} stops, {h.total_miles or 0} mi)" for h in recent_3])
    else:
        recent_str = "No recent trips."

    return f"""
You are talking to {first_name}. 
Their default city is {user_city}.
They have {trip_count} saved trips including: {trip_names}.
Their recent history:
{recent_str}
Their stats: {total_miles} total miles, {total_trips} total trips completed.
Always address them by their first name naturally in conversation — not every message, just when it feels natural like a real assistant would.
""".strip()


async def _run_agent_internal(
    message: str,
    conversation_history: List[Dict[str, Any]] | None = None,
    db: Any | None = None,
    user_id: str | None = None,
    user_city: str | None = None,
) -> Dict[str, Any]:
    """
    Run the LangChain ReAct agent for a single driver message.
    Automatically retries with a rotated Groq key on rate-limit errors.
    """
    global _agent_executor, _current_model_idx

    # Build real-time context
    user_context = _build_user_context_string(db, user_id, user_city)

    # Send only the last 4 messages to save tokens
    recent_history = (conversation_history or [])[-4:]
    chat_history_str = _format_history(recent_history)
    invoke_input = {
        "input": message,
        "chat_history": chat_history_str,
        "user_context": user_context,
    }

    last_exc: Exception | None = None
    groq_keys_tried = 1
    groq_models_tried = 1
    groq_model_retries = 0
    gemini_keys_tried = 1
    gemini_key_retries = 0

    while True:
        try:
            from app.agent.callbacks import ContextCallbackHandler
            from app.agent.tools import user_id_ctx, user_city_ctx
            
            # CRITICAL: Always reset contextvars at the start of every request
            # to prevent stale values from a previous request leaking across
            # the shared async event loop. This is a data isolation safeguard.
            user_id_ctx.set(user_id)
            user_city_ctx.set(user_city)

            # Inject user context into the callbacks so tools can access them
            context_callbacks = [ContextCallbackHandler(user_id=user_id, user_city=user_city, db=db)]
            
            result = await _agent_executor.ainvoke(invoke_input, config={"callbacks": context_callbacks})
            # Sticky model: remember which model succeeded so next request starts here
            reply = result.get("output", "")
            intermediate = result.get("intermediate_steps", [])

            # Primary: extract stops from geocode tool calls this turn
            stops_tools = _extract_stops_from_steps(intermediate)

            # Fallback: parse stops from the reply text (coordinates in Final Answer)
            stops_reply = _extract_stops_from_reply(reply)

            # ALWAYS prefer stops_tools — they contain real lat/lng from the Google Geocoding API.
            # stops_reply parses addresses from the agent's text reply which carries no real coordinates.
            # When a user corrects a stop mid-conversation, the agent only re-geocodes that one stop,
            # so stops_tools has 1 entry while stops_reply has all N entries parsed from text.
            # The old logic (prefer whichever has more entries) caused stops_reply to win, injecting
            # stale NYC default coordinates (40.7128, -74.006) into the stops array and making
            # calculate_route_stats() return N/A for distance and duration.
            # Only fall back to stops_reply if stops_tools is completely empty (e.g. trip loaded from saved data).
            stops = stops_tools if stops_tools else stops_reply

            # We no longer strip coordinates from the reply text here!
            # If we strip them here, the frontend won't save them in conversation history,
            # which forces the LLM to hallucinate missing lat/lng coordinates to save_trip_tool in the next turn!
            # Hiding the coordinates is now handled purely visually in frontend MessageBubble.jsx.

            response: Dict[str, Any] = {"reply": reply}
            if stops:
                # Calculate accurate distance & duration
                stats = await directions_service.calculate_route_stats(stops)
                response["total_distance_text"] = stats["distance"]
                response["total_duration_text"] = stats["duration"]
                
                response["stops"] = stops
                response["needs_confirmation"] = True

            return response

        except Exception as exc:
            last_exc = exc
            exc_str = str(exc).lower()

            # Hard fail across all providers if daily quota is definitively exhausted
            if "generaterequestsperday" in exc_str or "daily" in exc_str:
                logger.error("Daily quota exhausted. Stopping all retries immediately.")
                break

            if not _is_rate_limit_error(exc):
                raise
                
            provider = groq_rotator.current_provider
            
            if provider == "groq":
                if groq_model_retries < 1:
                    groq_model_retries += 1
                    logger.warning("Agent Groq rate limit on model %s, retry %d/1: %s", GROQ_MODELS[_current_model_idx], groq_model_retries, str(exc)[:80])
                    continue
                else:
                    # Model exhausted after 1 retry, rotate immediately
                    if groq_models_tried < len(GROQ_MODELS):
                        groq_models_tried += 1
                        _current_model_idx = (_current_model_idx + 1) % len(GROQ_MODELS)
                        logger.warning("Agent Groq model exhausted, rotating to next model: %s (%d/%d)", GROQ_MODELS[_current_model_idx], groq_models_tried, len(GROQ_MODELS))
                        _agent_executor = _build_executor()
                        groq_model_retries = 0
                        continue
                    else:
                        num_groq_keys = sum(1 for p, k in groq_rotator._keys if p == "groq")
                        if groq_keys_tried < num_groq_keys:
                            groq_keys_tried += 1
                            logger.warning("Agent Groq key exhausted across all models, rotating to next Groq key (%d/%d)", groq_keys_tried, num_groq_keys)
                            groq_rotator.refresh_chat_groq()
                            
                            # Start with the first model for the new key
                            _current_model_idx = 0
                            groq_models_tried = 1
                            groq_model_retries = 0
                            _agent_executor = _build_executor()
                            continue
                        else:
                            logger.warning("All Agent Groq keys and models completely exhausted, forcing Gemini fallback")
                            rotated = False
                            for _ in range(groq_rotator.key_count):
                                groq_rotator.refresh_chat_groq()
                                if groq_rotator.current_provider == "gemini":
                                    rotated = True
                                    break
                            if not rotated:
                                break
                            
                            _agent_executor = _build_executor()
                            continue
            else:
                num_gemini_keys = sum(1 for p, k in groq_rotator._keys if p == "gemini")

                should_fail_fast = "quota" in exc_str or "429" in exc_str or "resourceexhausted" in exc_str
                
                if not should_fail_fast and gemini_key_retries < 1:
                    gemini_key_retries += 1
                    logger.warning("Agent Gemini rate limit, retry %d/1. Waiting 30s...", gemini_key_retries)
                    await asyncio.sleep(30)
                    continue
                else:
                    if should_fail_fast:
                        logger.warning("Agent Gemini quota exhausted, failing fast to next key.")
                    else:
                        logger.warning("Agent Gemini retries exhausted for this key.")
                        
                    if gemini_keys_tried < num_gemini_keys:
                        gemini_keys_tried += 1
                        logger.warning("Rotating to next Gemini key (%d/%d)", gemini_keys_tried, num_gemini_keys)
                        groq_rotator.refresh_chat_groq()
                        _agent_executor = _build_executor()
                        gemini_key_retries = 0
                        continue
                    else:
                        logger.warning("All Gemini keys exhausted.")
                        break

        logger.error("All LLM keys rate-limited. Giving up. Last exc: %s", last_exc)
        return {
            "reply": "I'm a bit busy right now, please try again in a moment",
            "stops": []
        }
