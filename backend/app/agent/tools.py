
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List

import contextvars

from langchain.tools import tool  # pyright: ignore[reportMissingImports]

from app.database import SessionLocal  # pyright: ignore[reportMissingImports]
from app import models, schemas
from app.services import geocoding_service, vector_service
from app.services import trips_service

# Context variables for injecting request-scoped data into tools
user_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_id", default=None)
user_city_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_city", default=None)


logger = logging.getLogger(__name__)


def _run_async(coro):
    """Bridge async to sync safely (works in worker threads without an event loop)."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # We're inside an existing event loop — create a new one in a thread
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


@tool("geocode_stop")
async def geocode_stop_tool(query: str) -> Dict[str, Any]:
    """
    Resolves a place name, street name, or address description to a geocoded stop.
    For out-of-state stops, include the state in the query (e.g. "Times Square, New York, NY").

    Input: free-text description of a stop (string).
    Output: { success, lat, lng, formatted_address, error }.
    """
    # Safety net: if the LLM passes a JSON dict string, extract the query from it
    parsed_query = query
    if query.strip().startswith("{") and query.strip().endswith("}"):
        import json
        try:
            payload = json.loads(query)
            parsed_query = payload.get("query", query)
            # If override_city was embedded in JSON, append it to the query
            oc = payload.get("override_city", "")
            if oc and oc.strip():
                parsed_query = f"{parsed_query}, {oc.strip()}"
        except json.JSONDecodeError:
            pass

    user_city = user_city_ctx.get() or "Hicksville, NY"
    result = await geocoding_service.geocode(parsed_query, user_city=user_city)
    if not result.get("success"):
        return {"error": result.get("error", "This stop could not be found. Please ask the driver for a better description of this specific stop only.")}
    
    return result


@tool("search_saved_stops")
async def search_saved_stops_tool(query: str) -> List[Dict[str, Any]]:
    """
    Searches previously saved stops using semantic similarity.

    Input: description of the stop (string).
    Output: list of similar saved stops with similarity scores.
    """
    user_id = user_id_ctx.get()
    if user_id is None:
        return []
    return vector_service.search_stops(query, user_id, top_k=3)


@tool("search_saved_trips")
def search_saved_trips_tool(query: str) -> str:
    """
    Searches saved trips by name using fuzzy matching.

    Input: trip name or description (string).
    Output: matching trips with trip_id and stop count.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    user_id = user_id_ctx.get()
    if user_id is None:
        return "Error: Could not determine user ID."
    
    from sqlalchemy import text
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        query_words = query.strip().split()
        short_query = query_words[0] if len(query_words) > 1 else query
        
        logger.info("search_saved_trips: query=%r, short_query=%r, user_id=%r", query, short_query, str(user_id))
        
        sql = text("""
            SELECT id, name, 
                   (SELECT COUNT(*) FROM stops WHERE stops.trip_id = trips.id) as stop_count
            FROM trips 
            WHERE (name ILIKE :query OR name ILIKE :short_query)
            AND user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 3
        """)
        
        results = db.execute(sql, {
            "query": f"%{query}%",
            "short_query": f"%{short_query}%",
            "user_id": str(user_id)
        }).fetchall()
        
        logger.info("search_saved_trips: got %d rows", len(results))
        
        if not results:
            return f"No saved trips found matching '{query}'"
        
        output_lines = [f"Found {len(results)} trip(s) matching '{query}':"]
        for row in results:
            output_lines.append(f"- '{row[1]}' (trip_id: {row[0]}, stop_count: {row[2]})")
        
        return "\n".join(output_lines)
    finally:
        db.close()


@tool
def search_trips_by_stop(query: str) -> str:
    """Use this tool when the user asks which trip contains a specific stop or location. 
    Examples: 'which trip has IKEA', 'do any of my trips go to Westbury', 'which route stops at Home Depot'.
    Do NOT use for loading a trip by name — use search_saved_trips for that."""
    import logging
    logger = logging.getLogger(__name__)
    
    user_id = user_id_ctx.get()
    if user_id is None:
        return "Error: Could not determine user ID."
        
    from sqlalchemy import text
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        query_words = query.strip().split()
        short_query = query_words[0] if len(query_words) > 1 else query
        
        # Auto-handle simple plurals ("hospitals" -> "hospital")
        singular_query = query[:-1] if query.endswith('s') and len(query) > 4 else query
        
        logger.info(
            "search_trips_by_stop: query=%r, short_query=%r, singular_query=%r, user_id=%r",
            query, short_query, singular_query, str(user_id)
        )
        
        sql = text("""
            SELECT DISTINCT trips.id, trips.name, stops.label, stops.resolved
            FROM trips 
            JOIN stops ON stops.trip_id = trips.id 
            WHERE (stops.label ILIKE :query 
                   OR stops.resolved ILIKE :query
                   OR stops.label ILIKE :short_query 
                   OR stops.resolved ILIKE :short_query
                   OR stops.label ILIKE :singular_query
                   OR stops.resolved ILIKE :singular_query)
            AND trips.user_id = :user_id
        """)
        
        results = db.execute(sql, {
            "query": f"%{query}%", 
            "short_query": f"%{short_query}%", 
            "singular_query": f"%{singular_query}%",
            "user_id": str(user_id)
        }).fetchall()
        
        logger.info("search_trips_by_stop: got %d raw rows", len(results))
        
        if not results:
            return f"No saved trips contain a stop matching '{query}'"
            
        # Group by trip
        trips_found = {}
        for row in results:
            trip_id = row[0]
            trip_name = row[1]
            stop_label = row[2]
            
            if trip_id not in trips_found:
                trips_found[trip_id] = {"name": trip_name, "stops": []}
            trips_found[trip_id]["stops"].append(stop_label)
            
        output_lines = [f"Found {len(trips_found)} trip(s) with '{query}':"]
        for t_id, t_data in trips_found.items():
            output_lines.append(f"- '{t_data['name']}' (trip_id: {t_id}, stops: {', '.join(t_data['stops'])})")
            
        return "\n".join(output_lines)
    finally:
        db.close()


@tool("get_trip_by_id")
async def get_trip_by_id_tool(trip_id_str: str) -> Dict[str, Any]:
    """
    Fetches the full details of a saved trip including all stops in order.

    Input: trip ID as a string that can be parsed to an integer.
    Output: full trip object with ordered stops, or an error message.
    """
    try:
        trip_id = int(trip_id_str)
    except ValueError:
        return {"error": "trip_id must be an integer string."}

    user_id = user_id_ctx.get()
    if user_id is None:
        return {"error": "Authentication required."}
        
    db = SessionLocal()
    try:
        trip = await trips_service.get_trip(db, trip_id, user_id=user_id)
        if not trip:
            return {"error": f"Trip with id {trip_id} not found."}
        stops = [
            {
                "id": stop.id,
                "position": stop.position,
                "label": stop.label,
                "resolved": stop.resolved,
                "lat": stop.lat,
                "lng": stop.lng,
                "note": stop.note,
            }
            for stop in trip.stops
        ]
        return {"id": trip.id, "name": trip.name, "notes": trip.notes, "stops": stops}
    finally:
        db.close()


@tool("get_recent_history")
async def get_recent_history_tool(days_str: str = "7") -> List[Dict[str, Any]]:
    """
    Returns recent trip launch history for context.

    Input: number of days to look back, as a string (default "7").
    Output: list of recent launches with trip names and dates.
    """
    try:
        days = int(days_str)
    except ValueError:
        days = 7

    cutoff = datetime.utcnow() - timedelta(days=days)

    user_id = user_id_ctx.get()
    if user_id is None:
        return []

    db = SessionLocal()
    try:
        histories: List[models.TripHistory] = (
            db.query(models.TripHistory)
            .filter(models.TripHistory.user_id == user_id)
            .filter(models.TripHistory.launched_at >= cutoff)
            .order_by(models.TripHistory.launched_at.desc())
            .all()
        )
        return [
            {
                "id": h.id,
                "trip_id": h.trip_id,
                "trip_name": h.trip_name,
                "launched_at": h.launched_at.isoformat() if h.launched_at else None,
            }
            for h in histories
        ]
    finally:
        db.close()

@tool("save_trip")
async def save_trip_tool(trip_data_json: str) -> str:
    """
    Saves a trip and its stops to the database.
    Input MUST be a valid JSON string mapping to the trip schema:
    {
      "name": "string",
      "stops": [
        {"position": 0, "label": "string", "lat": float, "lng": float, "resolved": "string"}
      ]
    }
    IMPORTANT: You MUST copy the exact lat and lng float values from your previous message exactly out to their full decimal precision. Do not round or truncate them, otherwise the map will be broken.
    Output: success message with trip ID, or error message.
    """
    user_id = user_id_ctx.get()
    
    if user_id is None:
        return "Authentication required to save trips."

    try:
        data = json.loads(trip_data_json)
        
        # Override fabricated LLM coordinates with the proven coordinates from active route state
        active_route = active_route_ctx.get()
        if active_route and "stops" in data:
            for i, stop in enumerate(data["stops"]):
                if i < len(active_route):
                    real_stop = active_route[i]
                    if "lat" in real_stop and "lng" in real_stop:
                        stop["lat"] = real_stop["lat"]
                        stop["lng"] = real_stop["lng"]

        trip_in = schemas.TripCreate(**data)
    except Exception as e:
        return f"Error parsing input. Ensure you pass a valid JSON string. Detail: {str(e)}"
    
    db = SessionLocal()
    try:
        trip = await trips_service.create_trip(db, trip_in, user_id)
        return f"Successfully saved trip '{trip.name}' with ID {trip.id}"
    except Exception as e:
        return f"Database error while saving trip: {str(e)}"
    finally:
        db.close()

active_route_ctx: contextvars.ContextVar[List[Dict[str, Any]]] = contextvars.ContextVar("active_route", default=[])

def get_current_route() -> List[Dict[str, Any]]:
    return active_route_ctx.get()

@tool("modify_route")
async def modify_route_tool(input_str: str) -> str:
    """
    Modifies the current route by adding, removing, or replacing a stop.
    IMPORTANT: This tool mechanically updates the array in the backend. 
    You do NOT need to output the full route list in your text reply after using this.

    Input MUST be a valid JSON string with these fields:
    {
      "action": "add" | "remove" | "replace",
      "position": 1-based index (1 = first stop),
      "query": "place to search for" (required for add/replace, empty for remove),
      "place_name": "brand name like Walmart or Home Depot" (optional, helps labeling)
    }
    
    Example: {"action": "replace", "position": 2, "query": "Walmart Jericho", "place_name": "Walmart"}
    After a CITY MISMATCH, if the user confirms, re-call with confirmed=true:
    Example: {"action": "replace", "position": 2, "query": "Walmart Jericho", "place_name": "Walmart", "confirmed": true}
    
    Returns: Success message with the new place details, or error.
    """
    import json as _json
    import re

    # Parse the single string input as JSON
    try:
        payload = _json.loads(input_str) if isinstance(input_str, str) else input_str
    except (_json.JSONDecodeError, ValueError):
        return "Error: Input must be a valid JSON string with action, position, query fields."

    action = str(payload.get("action", "")).lower()
    position = int(payload.get("position", 0))
    query = str(payload.get("query", ""))
    place_name = str(payload.get("place_name", ""))
    confirmed = bool(payload.get("confirmed", False))

    route = active_route_ctx.get()
    
    if action not in ["add", "remove", "replace"]:
        return "Error: action must be 'add', 'remove', or 'replace'."
        
    # Convert from 1-indexed (user-facing) to 0-indexed (python array)
    idx = int(position) - 1

    if action == "remove":
        if idx < 0 or idx >= len(route):
            return f"Error: Cannot remove stop {position}. The route only has {len(route)} stops."
        removed = route.pop(idx)
        # Re-index the remaining stops
        for i, stop in enumerate(route):
            stop["position"] = i
        return f"Successfully removed '{removed.get('label')}' from position {position}."

    if action in ["add", "replace"]:
        if not query:
            return "Error: You must provide a query to search for the new place."
            
        # 1) Geocode the new place
        user_city = user_city_ctx.get() or "Hicksville, NY"
        geocoded = await geocoding_service.geocode(query, user_city=user_city)
        if not geocoded.get("success"):
            return f"Error: Could not find '{query}'. Ask the user for a more specific description."
            
        # Determine actual city from formatted_address for intelligent labeling
        resolved_address = geocoded.get("formatted_address", "")
        parts = [p.strip() for p in resolved_address.split(",")]
        actual_city = ""
        for i, p in enumerate(parts):
            if re.match(r'^[A-Z]{2}(\s+\d{5})?$', p.upper()):
                if i > 0:
                    actual_city = parts[i-1]
                break

        # City mismatch detection: if user said "Walmart Jericho" but it resolved
        # to Westbury, warn the agent so it can ask the user for confirmation.
        # Skip this check if the user already confirmed via confirmed=true.
        if not confirmed:
            query_words = query.strip().split()
            # Strip state abbreviations from query for clean comparison
            clean_query_words = [w for w in query_words if not re.match(r'^[A-Z]{2}$', w.upper()) and w.upper() not in ('USA', 'US')]
            if actual_city and len(clean_query_words) >= 2:
                # Check if any word in the query looks like a city name that doesn't match actual_city
                potential_city = clean_query_words[-1]  # Last word is often the city
                if (potential_city.lower() != actual_city.lower() 
                    and not re.search(r'\d', potential_city)  # Not a street number
                    and potential_city.lower() not in actual_city.lower()
                    and actual_city.lower() not in potential_city.lower()):
                    return (
                        f"CITY MISMATCH: The user requested '{query}' but the closest match is at "
                        f"'{resolved_address}' which is in {actual_city}, not {potential_city}. "
                        f"ASK the user: 'There's no {place_name or query_words[0]} in {potential_city}, "
                        f"but I found one at {resolved_address}. Want me to use that instead?' "
                        f"Do NOT modify the route until the user confirms. "
                        f"When the user confirms, call modify_route again with the SAME parameters plus \"confirmed\": true."
                    )

        # Dynamic cross-country labeling natively without hardcoding
        if place_name and actual_city:
            final_label = f"{place_name.strip()} {actual_city}"
        else:
            final_label = query.strip()
                    
        new_stop = {
            "label": final_label,
            "resolved": resolved_address,
            "lat": geocoded.get("lat"),
            "lng": geocoded.get("lng"),
            "note": None,
            "position": idx # Will be updated during re-indexing
        }
        
        if action == "replace":
            if idx < 0 or idx >= len(route):
                return f"Error: Cannot replace stop {position}. The route only has {len(route)} stops."
            old_stop = route[idx]
            route[idx] = new_stop
            # Re-index just in case
            for i, stop in enumerate(route):
                stop["position"] = i
            return f"Successfully replaced '{old_stop.get('label')}' at position {position} with '{new_stop['label']}' ({new_stop['resolved']})."
            
        elif action == "add":
            # For add, we insert before the requested position.
            if idx < 0:
                idx = 0
            route.insert(idx, new_stop)
            # Re-index all stops
            for i, stop in enumerate(route):
                stop["position"] = i
            return f"Successfully added '{new_stop['resolved']}' at position {position}."

@tool("check_compliance")
def check_compliance_tool(question: str) -> str:
    """
    Use this tool for ANY question about CDL rules, driving regulations,
    hours of service, vehicle inspections, pre-trip inspection, railroad crossings,
    school bus protocols, Article 19-A, emergency procedures, or any safety or
    legal question related to professional driving.

    ALWAYS call this tool before answering compliance questions.
    NEVER answer compliance questions from memory.

    Input: the driver's compliance question as a plain string.
    Output: grounded answer with source citations, or a message saying it cannot be found.
    """
    from app.database import SessionLocal
    from app.services.compliance_service import query_compliance
    from sqlalchemy import text

    user_id = user_id_ctx.get()
    db = SessionLocal()
    try:
        row = db.execute(
            text("SELECT state FROM user_profiles WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()
        user_state = row.state if row else "NY"

        return query_compliance(
            question=question,
            user_state=user_state,
            db=db,
        )
    finally:
        db.close()