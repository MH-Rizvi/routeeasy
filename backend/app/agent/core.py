
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import re as _re
from typing import Any, Dict, List

from langchain.agents import AgentExecutor, create_react_agent  # pyright: ignore[reportMissingImports]
from langchain.prompts import PromptTemplate  # pyright: ignore[reportMissingImports]

import app.agent.tools # pyright: ignore[reportMissingImports]
from app.agent.output_parser import RouteEasyOutputParser

from app.agent.callbacks import LLMOpsCallbackHandler # pyright: ignore[reportMissingImports]
from app.agent.prompts import SYSTEM_PROMPT_v1
from app.agent.tools import (
    geocode_stop_tool,
    search_saved_stops_tool,
    search_saved_trips_tool,
    search_trips_by_stop,
    get_trip_by_id_tool,
    get_recent_history_tool,
    save_trip_tool,
    modify_route_tool,
    check_compliance_tool,
)
from app.services import directions_service
from app.services.groq_client import groq_rotator, _is_rate_limit_error


logger = logging.getLogger(__name__)


_tools = [
    geocode_stop_tool,
    search_saved_stops_tool,
    search_saved_trips_tool,
    search_trips_by_stop,
    get_trip_by_id_tool,
    get_recent_history_tool,
    save_trip_tool,
    modify_route_tool,
    check_compliance_tool,
]

_prompt = PromptTemplate(
    template=SYSTEM_PROMPT_v1,
    input_variables=["input", "chat_history", "agent_scratchpad", "tools", "tool_names", "user_context", "current_route"],
)

# Ordered by reliability/capacity — less popular models first to reduce rate-limit hits.
# The last-successful model index is remembered ("sticky") across requests.

def _build_executor() -> AgentExecutor:
    """Build a fresh AgentExecutor using the current rotator key."""
    llm = groq_rotator.get_chat_llm(temperature=0)
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


def _normalize_label(s: str) -> str:
    """Remove punctuation, collapse whitespace for fuzzy comparison."""
    return _re.sub(r'\s+', ' ', _re.sub(r'[^\w\s]', '', s)).strip()


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

                # Check if this looks like a retry of the IMMEDIATELY PREVIOUS stop.
                # A genuine retry is always consecutive: the agent geocodes, gets a bad
                # result, and immediately re-geocodes with a refined query.
                # We ONLY check against the last stop (current_position - 1), NOT earlier
                # stops, to avoid false positives on loop routes where the final stop
                # returns to the same place as stop 1.
                is_retry = False
                retry_position = -1

                norm_current = _normalize_label(label_lower)

                if recent_labels:
                    prev_pos, prev_label = recent_labels[-1]
                    norm_prev = _normalize_label(prev_label)
                    if norm_current in norm_prev or norm_prev in norm_current:
                        # Additional guard: the two labels should be close in length
                        # (a refinement, not a completely different stop)
                        shorter = min(len(norm_current), len(norm_prev))
                        longer = max(len(norm_current), len(norm_prev))
                        if longer > 0 and (shorter / longer) >= 0.6:
                            is_retry = True
                            retry_position = prev_pos

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


_processing_messages: Dict[str, float] = {}

async def run_agent(
    message: str,
    conversation_history: List[Dict[str, Any]] | None = None,
    current_route: List[Dict[str, Any]] | None = None,
    db: Any | None = None,
    user_id: str | None = None,
    user_city: str | None = None,
    session_id: str | None = None,
) -> Dict[str, Any]:
    global _processing_messages
    import time
    
    # Include session_id in the hash so identical messages from different sessions
    # are never treated as duplicates (e.g., user refreshes and retypes same message).
    hash_input = f"{session_id or ''}:{message}"
    msg_hash = hashlib.md5(hash_input.encode("utf-8")).hexdigest()
    
    now = time.time()
    # Clean up stale entries older than 5 seconds
    _processing_messages = {k: v for k, v in _processing_messages.items() if now - v < 5}
    
    if msg_hash in _processing_messages:
        logger.warning("Duplicate request detected for hash %s. Skipping.", msg_hash)
        return {
            "reply": "I am already processing that request. Please wait a moment...",
            "stops": []
        }
        
    _processing_messages[msg_hash] = now
    try:
        return await _run_agent_internal(message, conversation_history, current_route, db, user_id, user_city)
    finally:
        _processing_messages.pop(msg_hash, None)


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
    current_route: List[Dict[str, Any]] | None = None,
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
    route_str = "No active route."
    if current_route and len(current_route) > 0:
        lines = []
        for i, stop in enumerate(current_route):
            lines.append(f"{i + 1}. {stop.get('label', 'Unknown')} ({stop.get('resolved', 'Unknown')})")
        route_str = "\n".join(lines)

    invoke_input = {
        "input": message,
        "chat_history": chat_history_str,
        "user_context": user_context,
        "current_route": route_str,
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
            from app.agent.tools import user_id_ctx, user_city_ctx, active_route_ctx
            
            # CRITICAL: Always reset contextvars at the start of every request
            # to prevent stale values from a previous request leaking across
            # the shared async event loop. This is a data isolation safeguard.
            user_id_ctx.set(user_id)
            user_city_ctx.set(user_city)
            # MUST deep copy! modify_route mutates the list in place. If we pass
            # the same reference, the route_changed diff later compares the
            # modified list against itself and always returns False.
            import copy
            prev_route_snapshot = copy.deepcopy(current_route or [])
            active_route_ctx.set(copy.deepcopy(current_route or []))

            # Inject user context into the callbacks so tools can access them
            context_callbacks = [ContextCallbackHandler(user_id=user_id, user_city=user_city, db=db)]
            
            result = await _agent_executor.ainvoke(invoke_input, config={"callbacks": context_callbacks})
            # Sticky model: remember which model succeeded so next request starts here
            reply = result.get("output", "")
            intermediate = result.get("intermediate_steps", [])

            # HYBRID STOP EXTRACTION:
            # Priority order:
            # 1. Check if get_trip_by_id was called — its stops take highest priority
            #    (this is crucial for loading saved trips back-to-back)
            # 2. Check if modify_route was used (amendments) — active_route_ctx has the updated array
            # 3. Fall back to _extract_stops_from_steps() for fresh route builds via geocode_stop
            
            # Always check intermediate steps first for get_trip_by_id results
            extracted = _extract_stops_from_steps(intermediate)
            logger.info("=== STOP EXTRACTION DEBUG ===")
            logger.info("_extract_stops_from_steps(): %d stops extracted", len(extracted) if extracted else 0)
            
            # Check if get_trip_by_id was used (loaded a saved trip)
            trip_loaded = any(
                step[0].tool == "get_trip_by_id" 
                for step in intermediate
            ) if intermediate else False
            
            if trip_loaded and extracted and len(extracted) >= 2:
                # Saved trip load — these stops take absolute priority
                stops = extracted
                logger.info("Stage 1 — Loaded saved trip: %d stops", len(stops))
            else:
                # Check active_route_ctx (modify_route amendments)
                from app.agent.tools import get_current_route
                stops = get_current_route()
                logger.info("Stage 2 — get_current_route(): %d stops", len(stops))
                
                if not stops or len(stops) < 2:
                    # Fall back to extracted geocode_stop results
                    if extracted and len(extracted) >= 2:
                        stops = extracted
                        logger.info("Stage 3 — Using extracted stops: %d", len(stops))

            # If still empty, try parsing from the reply text as a last resort
            if not stops or len(stops) < 2:
                extracted_reply = _extract_stops_from_reply(reply)
                logger.info("Stage 4 — _extract_stops_from_reply(): %d stops extracted", len(extracted_reply) if extracted_reply else 0)
                if extracted_reply and len(extracted_reply) >= 2:
                    stops = extracted_reply

            # Log intermediate steps tool names for debugging
            tool_names_used = [step[0].tool for step in intermediate] if intermediate else []
            logger.info("Tools used in this turn: %s", tool_names_used)
            logger.info("Final stops count: %d", len(stops))
            if stops:
                for i, s in enumerate(stops):
                    logger.info("  Stop %d: label=%s, resolved=%s, lat=%s, lng=%s", i, s.get('label'), s.get('resolved'), s.get('lat'), s.get('lng'))

            # We no longer strip coordinates from the reply text here!
            # If we strip them here, the frontend won't save them in conversation history,
            # which forces the LLM to hallucinate missing lat/lng coordinates to save_trip_tool in the next turn!
            # Hiding the coordinates is now handled purely visually in frontend MessageBubble.jsx.

            response: Dict[str, Any] = {"reply": reply}
            
            # Determine if the route actually changed mechanically
            # Uses prev_route_snapshot taken BEFORE the agent ran, so
            # in-place mutations by modify_route don't corrupt the comparison.
            route_changed = False
            logger.info("prev_route count: %d, stops count: %d", len(prev_route_snapshot), len(stops))
            if len(stops) != len(prev_route_snapshot):
                route_changed = True
            else:
                for s, p in zip(stops, prev_route_snapshot):
                    if s.get("label") != p.get("label") or s.get("resolved") != p.get("resolved"):
                        route_changed = True
                        break
            logger.info("route_changed: %s", route_changed)

            if stops and len(stops) >= 2 and route_changed:
                # Calculate accurate distance & duration
                stats = await directions_service.calculate_route_stats(stops)
                response["total_distance_text"] = stats["distance"]
                response["total_duration_text"] = stats["duration"]
                
                response["stops"] = stops
                logger.info("✅ Returning %d stops in response with distance=%s, duration=%s", len(stops), stats["distance"], stats["duration"])
            else:
                logger.info("❌ NOT returning stops. stops=%d, route_changed=%s", len(stops), route_changed)

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
                
            # 1-strike immediate rotation
            logger.warning(f"Agent Endpoint Encountered Rate Limit: {str(exc)[:80]}")
            found_next = groq_rotator.advance_on_failure()
            
            if not found_next:
                logger.error("All Agent fallback models exhausted.")
                break
                
            # Rebuild the executor with the new key/model
            _agent_executor = _build_executor()
            continue

        logger.error("All LLM keys rate-limited. Giving up. Last exc: %s", last_exc)
        return {
            "reply": "I'm a bit busy right now, please try again in a moment",
            "stops": []
        }
