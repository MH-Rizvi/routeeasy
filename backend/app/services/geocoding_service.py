
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
    async def _fetch_geocode(search_query: str, use_bias: bool = True) -> Dict[str, Any] | None:
        params = {
            "address": search_query,
            "key": settings.google_maps_api_key,
        }
        if use_bias:
            params["region"] = "us"
            params["components"] = "administrative_area:NY|country:US"
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
    default_state = default_parts[-1] if len(default_parts) > 1 else ""

    def _is_invalid_generic(fmt_addr: str) -> bool:
        if "City Hall" in fmt_addr:
            return True
        if ", New York," in fmt_addr or fmt_addr.startswith("New York,"):
            return True
        return False

    def _parse_res(res: Dict[str, Any], confidence: str) -> Dict[str, Any]:
        loc = res.get("geometry", {}).get("location") or {}
        return {
            "success": True,
            "lat": float(loc.get("lat")),
            "lng": float(loc.get("lng")),
            "formatted_address": res.get("formatted_address"),
            "confidence": confidence,
            "error": None,
        }

    # ATTEMPT 1: search with full user_city bias
    query_city = f"{query.strip()}, {user_city}"
    data1 = await _fetch_geocode(query_city, use_bias=True)
    res1 = data1.get("results", [])[0] if data1 and data1.get("status") == "OK" and data1.get("results") else None
    
    if res1 and not _is_invalid_generic(res1.get("formatted_address", "")):
        return _parse_res(res1, "high")

    # Fallback filtering logic
    def _filter_fallback_results(results: list) -> list:
        valid = []
        tokens = [t for t in query.lower().replace(",", " ").split() if len(t) > 2]
        if not tokens:
            tokens = [query.lower().strip()]
            
        for r in results:
            fmt_addr = r.get("formatted_address", "")
            if _is_invalid_generic(fmt_addr):
                continue
            if r.get("geometry", {}).get("location", {}).get("lat") is None:
                continue
                
            addr_lower = fmt_addr.lower()
            if any(t in addr_lower for t in tokens):
                valid.append(r)
        return valid[:3]

    # ATTEMPT 2: state only
    if default_state:
        query_state = f"{query.strip()}, {default_state}"
        data2 = await _fetch_geocode(query_state, use_bias=False)
        results2 = data2.get("results", []) if data2 and data2.get("status") == "OK" else []
        filtered2 = _filter_fallback_results(results2)
        if filtered2:
            return _parse_res(filtered2[0], "state_level")

    # ATTEMPT 3: national (no location bias)
    query_raw = f"{query.strip()}"
    data3 = await _fetch_geocode(query_raw, use_bias=False)
    results3 = data3.get("results", []) if data3 and data3.get("status") == "OK" else []
    filtered3 = _filter_fallback_results(results3)
    if filtered3:
        return _parse_res(filtered3[0], "national_level")

    # If all 3 attempts fail
    return {
        "success": False,
        "lat": None,
        "lng": None,
        "formatted_address": None,
        "confidence": "low",
        "error": "Could not find this stop",
    }
