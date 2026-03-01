
from __future__ import annotations

import logging
from typing import Any, Dict

import httpx

from app.config import settings


logger = logging.getLogger(__name__)

GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


async def geocode(query: str) -> Dict[str, Any]:
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

    # Helper function to fire the HTTP request and parse Google's format
    async def _fetch_geocode(search_query: str) -> Dict[str, Any] | None:
        params = {
            "address": search_query,
            "key": settings.google_maps_api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(GOOGLE_GEOCODE_URL, params=params)
                if resp.status_code != 200:
                    return None
                return resp.json()
        except:
            return None

    # Helper function to check if the default city is in the response components
    def _has_default_city(addr_components: list) -> bool:
        if not settings.default_city:
            return True
        city_lower = settings.default_city.lower()
        for comp in addr_components:
            types = comp.get("types", [])
            # Google maps classifies cities typically as locality
            if "locality" in types or "administrative_area_level_2" in types or "administrative_area_level_3" in types:
                if city_lower in comp.get("long_name", "").lower():
                    return True
                if city_lower in comp.get("short_name", "").lower():
                    return True
        return False

    # First attempt: exactly what the user literally typed
    data = await _fetch_geocode(query)
    
    if not data or data.get("status") != "OK":
        results1 = []
    else:
        results1 = data.get("results", [])

    confidence = "high"
    top_result = None

    if results1 and _has_default_city(results1[0].get("address_components", [])):
        # Perfect, we found it in the default city on the first try
        top_result = results1[0]
    else:
        # Either no results, or the result is NOT in the default city. 
        # So we aggressively append the default city and retry.
        full_query2 = f"{query}, {settings.default_city}"
        logger.info("Attempt 1 missed default city. Retrying with explicit bias: '%s'", full_query2)
        
        data2 = await _fetch_geocode(full_query2)
        if data2 and data2.get("status") == "OK" and data2.get("results"):
            results2 = data2.get("results", [])
            # Check if this new attempt actually found something in our city
            if _has_default_city(results2[0].get("address_components", [])):
                top_result = results2[0]
                # It's a save, but we had to inject the city, so we lower the confidence
                # so the agent verifies it with the driver instead of silently assuming
                confidence = "low"
                
    # If the retry failed too, fallback to the original attempt if there was ONE (even if wrong city)
    if not top_result and results1:
        top_result = results1[0]
        confidence = "low" # Wrong city, so confidence is definitively low

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

    return {
        "success": True,
        "lat": float(lat),
        "lng": float(lng),
        "formatted_address": formatted_address,
        "confidence": confidence,
        "error": None,
    }
