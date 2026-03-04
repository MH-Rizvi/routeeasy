
from __future__ import annotations

import logging
import re
from typing import Any, Dict

import httpx

from app.config import settings


logger = logging.getLogger(__name__)

GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

# Comprehensive US state mapping: abbreviation → (full_name, center_lat, center_lng)
_US_STATE_INFO: Dict[str, tuple[str, float, float]] = {
    "AL": ("Alabama",           32.806671,  -86.791130),
    "AK": ("Alaska",            61.370716, -152.404419),
    "AZ": ("Arizona",           33.729759, -111.431221),
    "AR": ("Arkansas",          34.969704,  -92.373123),
    "CA": ("California",        36.116203, -119.681564),
    "CO": ("Colorado",          39.059811, -105.311104),
    "CT": ("Connecticut",       41.597782,  -72.755371),
    "DE": ("Delaware",          39.318523,  -75.507141),
    "FL": ("Florida",           27.766279,  -81.686783),
    "GA": ("Georgia",           33.040619,  -83.643074),
    "HI": ("Hawaii",            21.094318, -157.498337),
    "ID": ("Idaho",             44.240459, -114.478828),
    "IL": ("Illinois",          40.349457,  -88.986137),
    "IN": ("Indiana",           39.849426,  -86.258278),
    "IA": ("Iowa",              42.011539,  -93.210526),
    "KS": ("Kansas",            38.526600,  -96.726486),
    "KY": ("Kentucky",          37.668140,  -84.670067),
    "LA": ("Louisiana",         31.169546,  -91.867805),
    "ME": ("Maine",             44.693947,  -69.381927),
    "MD": ("Maryland",          39.063946,  -76.802101),
    "MA": ("Massachusetts",     42.230171,  -71.530106),
    "MI": ("Michigan",          43.326618,  -84.536095),
    "MN": ("Minnesota",         45.694454,  -93.900192),
    "MS": ("Mississippi",       32.741646,  -89.678696),
    "MO": ("Missouri",          38.456085,  -92.288368),
    "MT": ("Montana",           46.921925, -110.454353),
    "NE": ("Nebraska",          41.125370,  -98.268082),
    "NV": ("Nevada",            38.313515, -117.055374),
    "NH": ("New Hampshire",     43.452492,  -71.563896),
    "NJ": ("New Jersey",        40.298904,  -74.521011),
    "NM": ("New Mexico",        34.840515, -106.248482),
    "NY": ("New York",          42.165726,  -74.948051),
    "NC": ("North Carolina",    35.630066,  -79.806419),
    "ND": ("North Dakota",      47.528912, -99.784012),
    "OH": ("Ohio",              40.388783,  -82.764915),
    "OK": ("Oklahoma",          35.565342,  -96.928917),
    "OR": ("Oregon",            44.572021, -122.070938),
    "PA": ("Pennsylvania",      40.590752,  -77.209755),
    "RI": ("Rhode Island",      41.680893,  -71.511780),
    "SC": ("South Carolina",    33.856892,  -80.945007),
    "SD": ("South Dakota",      44.299782,  -99.438828),
    "TN": ("Tennessee",         35.747845,  -86.692345),
    "TX": ("Texas",             31.054487,  -97.563461),
    "UT": ("Utah",              40.150032, -111.862434),
    "VT": ("Vermont",           44.045876,  -72.710686),
    "VA": ("Virginia",          37.769337,  -78.169968),
    "WA": ("Washington",        47.400902, -121.490494),
    "WV": ("West Virginia",     38.491226,  -80.954453),
    "WI": ("Wisconsin",         44.268543,  -89.616508),
    "WY": ("Wyoming",           42.755966, -107.302490),
    "DC": ("District of Columbia", 38.907192, -77.036871),
}

# Build a case-insensitive lookup: name/alias → abbreviation
_STATE_LOOKUP: Dict[str, str] = {}
for _abbr, (_full_name, _, _) in _US_STATE_INFO.items():
    _STATE_LOOKUP[_abbr.upper()] = _abbr
    _STATE_LOOKUP[_full_name.upper()] = _abbr

# Common variations and aliases
_STATE_ALIASES: Dict[str, str] = {
    # DC variations
    "D.C.": "DC", "WASHINGTON DC": "DC", "WASHINGTON D.C.": "DC",
    "WASHINGTON, DC": "DC", "WASHINGTON, D.C.": "DC",
    "DIST. OF COLUMBIA": "DC", "DIST OF COLUMBIA": "DC",
    # Common abbreviation variations
    "N.Y.": "NY", "N.J.": "NJ", "N.H.": "NH", "N.M.": "NM",
    "N.C.": "NC", "N.D.": "ND", "S.C.": "SC", "S.D.": "SD",
    "W.V.": "WV", "W.VA.": "WV", "R.I.": "RI", "D.C.": "DC",
    "CALIF.": "CA", "CALIF": "CA", "FLA.": "FL", "FLA": "FL",
    "ILL.": "IL", "ILL": "IL", "IND.": "IN",
    "MASS.": "MA", "MASS": "MA", "MICH.": "MI", "MICH": "MI",
    "MINN.": "MN", "MINN": "MN", "MISS.": "MS", "MISS": "MS",
    "NEBR.": "NE", "NEBR": "NE", "NEV.": "NV",
    "OKLA.": "OK", "OKLA": "OK", "ORE.": "OR", "ORE": "OR",
    "PENN.": "PA", "PENN": "PA", "PENNA.": "PA",
    "TENN.": "TN", "TENN": "TN", "TEX.": "TX", "TEX": "TX",
    "WASH.": "WA", "WASH": "WA", "WIS.": "WI", "WIS": "WI",
    "WYO.": "WY", "WYO": "WY", "ARIZ.": "AZ", "ARIZ": "AZ",
    "ARK.": "AR", "ARK": "AR", "COLO.": "CO", "COLO": "CO",
    "CONN.": "CT", "CONN": "CT", "DEL.": "DE", "DEL": "DE",
    "KANS.": "KS", "KANS": "KS", "KAN.": "KS", "KAN": "KS",
    "MONT.": "MT", "MONT": "MT",
}
_STATE_LOOKUP.update(_STATE_ALIASES)


def _extract_state_from_query(query: str) -> tuple[str, float, float] | None:
    """
    Detect if the query contains a US state name or abbreviation.
    Returns (abbreviation, center_lat, center_lng) if found, else None.
    Case-insensitive. Checks comma-separated tokens from right to left.
    """
    parts = [p.strip() for p in query.split(",")]
    for part in reversed(parts):
        token = part.strip().upper()
        if token in _STATE_LOOKUP:
            abbr = _STATE_LOOKUP[token]
            _, lat, lng = _US_STATE_INFO[abbr]
            return abbr, lat, lng
    return None


async def geocode(query: str, user_city: str) -> Dict[str, Any]:
    """
    Resolve a place/address description to lat/lng using Google Geocoding API.
    
    If the query already contains a state abbreviation (e.g. from out-of-state routing),
    that state is used for biasing instead of the user's registered city.

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

    # Detect if the query itself already specifies a state
    state_result = _extract_state_from_query(query)
    
    # If query has a state embedded, use that state for biasing (out-of-state routing)
    # Otherwise use the user's registered city/state
    if state_result:
        # The query already has the target state — use built-in center coordinates
        bias_state, lat_center, lng_center = state_result
    else:
        # Normal local routing — bias toward user's registered city
        default_parts = [p.strip() for p in user_city.split(",")] if user_city else []
        bias_state = default_parts[-1].strip().upper() if len(default_parts) > 1 else ""
        # Look up the user's home state center coords from our built-in table
        if bias_state and bias_state in _US_STATE_INFO:
            _, lat_center, lng_center = _US_STATE_INFO[bias_state]
        elif bias_state and bias_state in _STATE_LOOKUP:
            abbr = _STATE_LOOKUP[bias_state]
            _, lat_center, lng_center = _US_STATE_INFO[abbr]
            bias_state = abbr
        else:
            lat_center, lng_center = None, None

    # Helper function to fire the HTTP request and parse Google's format
    async def _fetch_geocode(search_query: str, use_bias: bool = True) -> Dict[str, Any] | None:
        params = {
            "address": search_query,
            "key": settings.google_maps_api_key,
        }
        if use_bias and bias_state:
            params["region"] = "us"
            params["components"] = f"administrative_area:{bias_state}|country:US"
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

    def _is_invalid_generic(fmt_addr: str) -> bool:
        """Reject results that are just a city name, not a specific place."""
        if "City Hall" in fmt_addr:
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

    # ATTEMPT 1: search with bias toward the detected or registered state
    if state_result:
        # Query already has state — send it directly to Google without appending user_city
        data1 = await _fetch_geocode(query.strip(), use_bias=True)
    else:
        # Local routing — append user_city for context
        query_city = f"{query.strip()}, {user_city}"
        data1 = await _fetch_geocode(query_city, use_bias=True)
    
    res1 = data1.get("results", [])[0] if data1 and data1.get("status") == "OK" and data1.get("results") else None
    
    if res1 and not _is_invalid_generic(res1.get("formatted_address", "")):
        return _parse_res(res1, "high")

    # ATTEMPT 2: no location bias, just the raw query
    data2 = await _fetch_geocode(query.strip(), use_bias=False)
    results2 = data2.get("results", []) if data2 and data2.get("status") == "OK" else []
    if results2:
        for r in results2:
            fmt_addr = r.get("formatted_address", "")
            if _is_invalid_generic(fmt_addr):
                continue
            if r.get("geometry", {}).get("location", {}).get("lat") is not None:
                return _parse_res(r, "state_level")

    # If both attempts fail
    return {
        "success": False,
        "lat": None,
        "lng": None,
        "formatted_address": None,
        "confidence": "low",
        "error": "Could not find this stop",
    }

