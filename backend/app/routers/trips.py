
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import Session  # pyright: ignore[reportMissingImports]

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.services import trips_service

router = APIRouter(tags=["trips"])

# ── Semantic search (MUST be before /trips/{trip_id} to avoid "search" being matched as an ID) ──

@router.get("/trips/search", response_model=schemas.TripsSearchResponse)
async def search_trips(
    q: str = Query(..., min_length=1, description="Semantic search query"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> schemas.TripsSearchResponse:
    """Semantic search over saved trips using ChromaDB vector similarity."""
    results = vector_service.search_trips(q, current_user.id, top_k=10)

    # Enrich with SQLite data (stop_count, etc.) and build response
    search_results: List[schemas.TripSearchResult] = []
    for r in results:
        metadata = r.get("metadata", {})
        trip_id = metadata.get("trip_id")
        if trip_id is None:
            continue
        search_results.append(
            schemas.TripSearchResult(
                id=trip_id,
                name=metadata.get("name", ""),
                stop_count=metadata.get("stop_count", 0),
                similarity=round(r.get("similarity", 0), 4),
            )
        )

    return schemas.TripsSearchResponse(results=search_results)


# ── CRUD ────────────────────────────────────────────────────────────────────────

@router.get("/trips", response_model=List[schemas.Trip])
async def list_trips(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> List[schemas.Trip]:
    trips = await trips_service.list_trips(db, current_user.id)
    return trips  # pyright: ignore[reportReturnType]


@router.get("/trips/{trip_id}", response_model=schemas.Trip)
async def get_trip(
    trip_id: int, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> schemas.Trip:
    trip = await trips_service.get_trip(db, trip_id, current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found.",
        )
    return trip


@router.post("/trips", response_model=schemas.Trip, status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_data: schemas.TripCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> schemas.Trip:
    trip = await trips_service.create_trip(db, trip_data, current_user.id)
    return trip


@router.put("/trips/{trip_id}", response_model=schemas.Trip)
async def update_trip(
    trip_id: int,
    trip_data: schemas.TripUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> schemas.Trip:
    trip = await trips_service.update_trip(db, trip_id, trip_data, current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found.",
        )
    return trip


@router.delete("/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: int, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> Response:
    success = await trips_service.delete_trip(db, trip_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/trips/{trip_id}/launch", response_model=schemas.TripHistory)
async def launch_trip(
    trip_id: int, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> schemas.TripHistory:
    history = await trips_service.launch_trip(db, trip_id, current_user.id)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found.",
        )
    return history
