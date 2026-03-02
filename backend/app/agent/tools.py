
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
user_id_ctx: contextvars.ContextVar[int | None] = contextvars.ContextVar("user_id", default=None)
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
def geocode_stop_tool(query: str) -> Dict[str, Any]:
    """
    Resolves a place name, street name, or address description to a geocoded stop.

    Input: free-text description of a stop.
    Output: { success, lat, lng, formatted_address, error }.
    """
    user_city = user_city_ctx.get() or "Hicksville, NY"
    result = _run_async(geocoding_service.geocode(query, user_city=user_city))
    if not result.get("success"):
        return {"error": result.get("error", "This stop could not be found. Please ask the driver for a better description of this specific stop only.")}
    if result.get("success") and result.get("confidence") == "low":
        result["warning"] = "LOW CONFIDENCE RESOLUTION. The agent MUST ask the driver to explicitly confirm this formatted_address before proceeding."
    return result


@tool("search_saved_stops")
def search_saved_stops_tool(query: str) -> List[Dict[str, Any]]:
    """
    Searches previously saved stops using semantic similarity.

    Input: description of the stop (string).
    Output: list of similar saved stops with similarity scores.
    """
    user_id = user_id_ctx.get()
    if not user_id:
        return []
    return vector_service.search_stops(query, user_id, top_k=3)


@tool("search_saved_trips")
def search_saved_trips_tool(query: str) -> List[Dict[str, Any]]:
    """
    Searches saved trips using semantic similarity.

    Input: description of the trip (string).
    Output: list of similar saved trips with similarity scores.
    """
    user_id = user_id_ctx.get()
    if not user_id:
        return []
    return vector_service.search_trips(query, user_id, top_k=3)


@tool("get_trip_by_id")
def get_trip_by_id_tool(trip_id_str: str) -> Dict[str, Any]:
    """
    Fetches the full details of a saved trip including all stops in order.

    Input: trip ID as a string that can be parsed to an integer.
    Output: full trip object with ordered stops, or an error message.
    """
    try:
        trip_id = int(trip_id_str)
    except ValueError:
        return {"error": "trip_id must be an integer string."}

    async def _fetch():
        user_id = user_id_ctx.get()
        if not user_id:
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

    return _run_async(_fetch())


@tool("get_recent_history")
def get_recent_history_tool(days_str: str = "7") -> List[Dict[str, Any]]:
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
    if not user_id:
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
def save_trip_tool(trip_data_json: str) -> str:
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
    try:
        data = json.loads(trip_data_json)
        # Handle the case where the LLM might hallucinate a `notes` field or others not matching exactly if it isn't strict,
        # but schemas.TripCreate handles standard parsing gracefully.
        trip_in = schemas.TripCreate(**data)
    except Exception as e:
        return f"Error parsing input. Ensure you pass a valid JSON string. Detail: {str(e)}"
    
    async def _save():
        user_id = user_id_ctx.get()
        if not user_id:
            return "Authentication required to save trips."
            
        db = SessionLocal()
        try:
            trip = await trips_service.create_trip(db, trip_in, user_id)
            return f"Successfully saved trip '{trip.name}' with ID {trip.id}"
        except Exception as e:
            return f"Database error while saving trip: {str(e)}"
        finally:
            db.close()
            
    return _run_async(_save())


