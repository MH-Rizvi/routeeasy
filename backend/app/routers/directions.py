from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends  # pyright: ignore[reportMissingImports]

from app.auth import get_current_user
from app.services import directions_service

router = APIRouter(tags=["directions"])

@router.post("/directions/stats")
async def get_route_stats(
    payload: dict,
    current_user: Any = Depends(get_current_user),
):
    stops = payload.get("stops", [])
    if len(stops) < 2:
        return {"distance": "N/A", "duration": "N/A"}
    stats = await directions_service.calculate_route_stats(stops)
    return stats
