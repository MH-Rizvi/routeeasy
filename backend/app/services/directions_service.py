import json
import logging
from typing import List, Dict

import httpx
from app.config import settings

logger = logging.getLogger(__name__)


async def calculate_route_miles(stops: List[Dict[str, float]]) -> float:
    """Calculate total route distance in miles using Google Directions API.

    Args:
        stops: List of dictionaries each containing ``lat`` and ``lng`` keys.
               The first element is the origin, the last is the destination,
               and any intermediate elements are treated as waypoints.
    Returns:
        Total distance of the route in miles (rounded to 2 decimal places).
        Returns ``0.0`` on any error or if insufficient stops are provided.
    """
    if not stops or len(stops) < 2:
        return 0.0
    try:
        origin = f"{stops[0]['lat']},{stops[0]['lng']}"
        destination = f"{stops[-1]['lat']},{stops[-1]['lng']}"
        waypoint_str = "|".join(
            f"{stop['lat']},{stop['lng']}" for stop in stops[1:-1]
        ) if len(stops) > 2 else ""
        params = {
            "origin": origin,
            "destination": destination,
            "key": settings.google_maps_api_key,
        }
        if waypoint_str:
            params["waypoints"] = waypoint_str
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/directions/json", params=params
            )
        response.raise_for_status()
        data = response.json()
        if data.get("status") != "OK":
            logger.error("Google Directions API error: %s", data.get("status"))
            return 0.0
        total_meters = 0
        for route in data.get("routes", []):
            for leg in route.get("legs", []):
                total_meters += leg.get("distance", {}).get("value", 0)
        total_miles = total_meters * 0.000621371
        return round(total_miles, 2)
    except Exception as e:
        logger.error("Failed to calculate route miles: %s", e)
        return 0.0
