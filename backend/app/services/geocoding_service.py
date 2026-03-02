
from __future__ import annotations

import math
import logging
from typing import Any, Dict

import httpx

from app.config import settings


logger = logging.getLogger(__name__)

GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

# Cache city coordinates to avoid redundant Google Maps API calls
_city_coords_cache: Dict[str, tuple[float | None, float | None]] = {}

async def _get_city_coords(city: str) -> tuple[float | None, float | None]:
    if not city:
        return None, None
    if city in _city_coords_cache:
        return _city_coords_cache[city]
    
    if not settings.google_maps_api_key:
        return None, None
        
    params = {
        "address": city,
        "key": settings.google_maps_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(GOOGLE_GEOCODE_URL, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "OK" and data.get("results"):
                    loc = data["results"][0].get("geometry", {}).get("location", {})
                    if "lat" in loc and "lng" in loc:
                        _city_coords_cache[city] = (float(loc["lat"]), float(loc["lng"]))
                        return _city_coords_cache[city]
    except Exception as exc:
        logger.error("Error geocoding city '%s': %s", city, exc)
        
    return None, None


async def geocode(query: str, user_city: str) -> Dict[str, Any]:
    """
    Resolve a place/address description to lat/lng using Google Geocoding API.

    Returns a dict:
    {
        "success": bool,
        "lat": float | None,
        "lng": float | None,
        "formatted_address": str | None,
        "confidence": str,  # "high" or "low"
        "error": str | None,
    }
    """
    if not query.strip():
        return {
            "success": False,
            "lat": None,
            "lng": None,
            "formatted_address": None,
            "confidence": "low",
            "error": "Empty query.",
        }

    if not settings.google_maps_api_key:
        logger.error("GOOGLE_MAPS_API_KEY is not configured.")
        return {
            "success": False,
            "lat": None,
            "lng": None,
            "formatted_address": None,
            "confidence": "low",
            "error": "Geocoding service is not configured.",
        }

    # 1. Init default city coords lazily
    lat_center, lng_center = await _get_city_coords(user_city)

    # Helper function to fire the HTTP request and parse Google's format
    async def _fetch_geocode(search_query: str) -> Dict[str, Any] | None:
        params = {
            "address": search_query,
            "key": settings.google_maps_api_key,
            "region": "us",
            "components": "administrative_area:NY|country:US",
        }
        if lat_center is not None and lng_center is not None:
            params["location"] = f"{lat_center},{lng_center}"
            params["radius"] = "50000"
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(GOOGLE_GEOCODE_URL, params=params)
                if resp.status_code != 200:
                    return None
                return resp.json()
        except:
            return None

    # Extract city and state from user_city
    default_parts = [p.strip() for p in user_city.split(",")] if user_city else []
    default_city_name = default_parts[0] if default_parts else ""
    default_state = default_parts[-1] if len(default_parts) > 1 else ""

    # 2. Prepare search query (Always append user_city)
    search_query = f"{query.strip()}, {user_city}"

    # First attempt
    data = await _fetch_geocode(search_query)
    results = data.get("results", []) if data and data.get("status") == "OK" else []
    
    top_result = results[0] if results else None
    confidence = "high"

    # 3 & 4. Confidence check and Retry
    if top_result:
        fmt_addr = top_result.get("formatted_address", "")
        
        is_missing_state = default_state and default_state not in fmt_addr
        
        if is_missing_state:
            confidence = "low"
            # Retry with ", {user_city}" appended if it isn't already there
            retry_query = f"{query.strip()}, {user_city}"
            if search_query != retry_query:
                logger.info("Result '%s' missing state %s. Retrying with '%s'", fmt_addr, default_state, retry_query)
                data2 = await _fetch_geocode(retry_query)
                results2 = data2.get("results", []) if data2 and data2.get("status") == "OK" else []
                if results2:
                    top_result = results2[0]

    if not top_result:
        return {
            "success": False,
            "lat": None,
            "lng": None,
            "formatted_address": None,
            "confidence": "low",
            "error": "No results found.",
        }

    geometry = top_result.get("geometry", {})
    location = geometry.get("location") or {}

    lat = location.get("lat")
    lng = location.get("lng")
    formatted_address = top_result.get("formatted_address")

    if lat is None or lng is None or not formatted_address:
        return {
            "success": False,
            "lat": None,
            "lng": None,
            "formatted_address": None,
            "confidence": "low",
            "error": "Geocoding response was incomplete.",
        }

    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 3958.8 # miles
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    # 5. Validation Check
    is_invalid = False
    if "City Hall" in formatted_address:
        is_invalid = True
    elif ", New York," in formatted_address or formatted_address.startswith("New York,"):
        is_invalid = True

    if lat_center is not None and lng_center is not None:
        dist = _haversine(lat_center, lng_center, float(lat), float(lng))
        if dist > 30.0:
            is_invalid = True

    if is_invalid:
        return {
            "success": False,
            "lat": None,
            "lng": None,
            "formatted_address": None,
            "confidence": "low",
            "error": "Could not find this stop in your area",
        }

    return {
        "success": True,
        "lat": float(lat),
        "lng": float(lng),
        "formatted_address": formatted_address,
        "confidence": confidence,
        "error": None,
    }
