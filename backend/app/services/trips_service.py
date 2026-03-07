
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session  # pyright: ignore[reportMissingImports]

from app import models, schemas
from app.services import vector_service, directions_service


logger = logging.getLogger(__name__)


async def create_trip(db: Session, trip_data: schemas.TripCreate, user_id: str) -> models.Trip:
    """
    Create a new trip with stops.

    1. Write trip and stops to SQLite.
    2. Write each stop to ChromaDB and store chroma_id on the Stop.
    3. Write trip to ChromaDB and store chroma_id on the Trip.
    """
    db_trip = models.Trip(name=trip_data.name, notes=trip_data.notes, user_id=user_id)
    db.add(db_trip)
    db.flush()  # Get trip ID before creating stops

    stops_payload: List[dict] = []

    for stop_data in trip_data.stops:
        db_stop = models.Stop(
            trip_id=db_trip.id,
            position=stop_data.position,
            label=stop_data.label,
            resolved=stop_data.resolved,
            lat=stop_data.lat,
            lng=stop_data.lng,
            note=stop_data.note,
            user_id=user_id,
        )
        db.add(db_stop)
        db.flush()

        # Add to ChromaDB and store chroma_id
        chroma_id = vector_service.add_stop(
            stop_id=db_stop.id,
            trip_id=db_trip.id,
            label=db_stop.label,
            resolved=db_stop.resolved,
            lat=db_stop.lat,
            lng=db_stop.lng,
            user_id=user_id,
        )
        db_stop.chroma_id = chroma_id

        stops_payload.append(
            {
                "label": db_stop.label,
                "resolved": db_stop.resolved,
                "lat": db_stop.lat,
                "lng": db_stop.lng,
                "position": db_stop.position,
            }
        )

    # Write trip to ChromaDB
    trip_chroma_id = vector_service.add_trip(
        trip_id=db_trip.id,
        name=db_trip.name,
        stops=stops_payload,
        user_id=user_id,
    )
    db_trip.chroma_id = trip_chroma_id

    db.commit()
    db.refresh(db_trip)
    return db_trip


async def get_trip(db: Session, trip_id: int, user_id: str) -> Optional[models.Trip]:
    """Fetch a single trip with all stops."""
    trip = (
        db.query(models.Trip)
        .filter(models.Trip.id == trip_id)
        .filter(models.Trip.user_id == user_id)
        .first()
    )
    return trip


async def list_trips(db: Session, user_id: str) -> List[models.Trip]:
    """Return all saved trips."""
    trips = db.query(models.Trip).filter(models.Trip.user_id == user_id).order_by(models.Trip.created_at.desc()).all()
    return trips


async def update_trip(
    db: Session, trip_id: int, trip_data: schemas.TripUpdate, user_id: str
) -> Optional[models.Trip]:
    """
    Update a trip's name, notes, and optionally replace its stops.

    When stops are supplied:
    1. Delete old stops from ChromaDB.
    2. Delete old Stop rows from SQLite.
    3. Insert new stops to SQLite + ChromaDB.
    4. Update the trip document in ChromaDB with the new stop labels.
    """
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).filter(models.Trip.user_id == user_id).first()
    if not trip:
        return None

    # Update scalar fields
    if trip_data.name is not None:
        trip.name = trip_data.name
    if trip_data.notes is not None:
        trip.notes = trip_data.notes

    # Replace stops if provided
    if trip_data.stops is not None:
        # Delete old stops from ChromaDB
        for stop in trip.stops:
            if stop.chroma_id:
                try:
                    vector_service.delete_stop(stop.chroma_id, user_id)
                except Exception as exc:
                    logger.error("Failed to delete stop chroma_id=%s: %s", stop.chroma_id, exc)

        # Delete old Stop rows (cascade won't fire here, do it manually)
        for stop in trip.stops:
            db.delete(stop)
        db.flush()

        # Insert new stops
        stops_payload: List[dict] = []
        for stop_data in trip_data.stops:
            db_stop = models.Stop(
                trip_id=trip.id,
                position=stop_data.position,
                label=stop_data.label,
                resolved=stop_data.resolved,
                lat=stop_data.lat,
                lng=stop_data.lng,
                note=stop_data.note,
                user_id=user_id,
            )
            db.add(db_stop)
            db.flush()

            chroma_id = vector_service.add_stop(
                stop_id=db_stop.id,
                trip_id=trip.id,
                label=db_stop.label,
                resolved=db_stop.resolved,
                lat=db_stop.lat,
                lng=db_stop.lng,
                user_id=user_id,
            )
            db_stop.chroma_id = chroma_id

            stops_payload.append({"label": db_stop.label})

        # Update the trip document in ChromaDB
        if trip.chroma_id:
            try:
                vector_service.delete_trip(trip.chroma_id, user_id)
            except Exception:
                pass
        trip_chroma_id = vector_service.add_trip(
            trip_id=trip.id,
            name=trip.name,
            stops=stops_payload,
            user_id=user_id,
        )
        trip.chroma_id = trip_chroma_id
    else:
        # Even if only name changed, update the ChromaDB trip document
        if trip.chroma_id and trip_data.name is not None:
            try:
                vector_service.delete_trip(trip.chroma_id, user_id)
            except Exception:
                pass
            stops_payload = [{"label": s.label} for s in trip.stops]
            trip_chroma_id = vector_service.add_trip(
                trip_id=trip.id,
                name=trip.name,
                stops=stops_payload,
                user_id=user_id,
            )
            trip.chroma_id = trip_chroma_id

    db.commit()
    db.refresh(trip)
    return trip


async def delete_trip(db: Session, trip_id: int, user_id: str) -> bool:
    """
    Delete a trip from SQLite and ChromaDB.

    1. Load trip and stops.
    2. Delete associated ChromaDB documents for stops and trip.
    3. Delete trip (and cascading stops) from SQLite.
    """
    trip = (
        db.query(models.Trip)
        .filter(models.Trip.id == trip_id)
        .first()
    )
    if not trip:
        return False

    # Delete stop documents from ChromaDB
    for stop in trip.stops:
        if stop.chroma_id:
            try:
                vector_service.delete_stop(stop.chroma_id, user_id)
            except Exception as exc:
                logger.error(
                    "Failed to delete stop %s from ChromaDB (chroma_id=%s): %s",
                    stop.id,
                    stop.chroma_id,
                    exc,
                )

    # Delete trip document from ChromaDB
    if trip.chroma_id:
        try:
            vector_service.delete_trip(trip.chroma_id, user_id)
        except Exception as exc:
            logger.error(
                "Failed to delete trip %s from ChromaDB (chroma_id=%s): %s",
                trip.id,
                trip.chroma_id,
                exc,
            )

    db.delete(trip)
    db.commit()
    logger.info("Trip deleted successfully: trip_id=%s, user_id=%s", trip_id, user_id)
    return True


async def launch_trip(db: Session, trip_id: int, user_id: str) -> Optional[models.TripHistory]:
    """
    Record a trip launch:

    - Update last_used and use_count on the trip.
    - Create a TripHistory snapshot in SQLite.
    - Add a corresponding history entry in ChromaDB for RAG.
    """
    trip = (
        db.query(models.Trip)
        .filter(models.Trip.id == trip_id)
        .filter(models.Trip.user_id == user_id)
        .first()
    )
    if not trip:
        return None

    now = datetime.utcnow()
    trip.last_used = now
    trip.use_count = (trip.use_count or 0) + 1

    # Snapshot stops as JSON for history
    stops_snapshot = [
        {
            "label": stop.label,
            "resolved": stop.resolved,
            "lat": stop.lat,
            "lng": stop.lng,
            "position": stop.position,
            "note": stop.note,
        }
        for stop in trip.stops
    ]

    history = models.TripHistory(
        user_id=user_id,
        trip_id=trip.id,
        trip_name=trip.name,
        raw_input="saved_trip",
        stops_json=json.dumps(stops_snapshot),
    )
    db.add(history)
    db.flush()  # Get history ID and launched_at
    db.refresh(history)

    launched_at_str = (
        history.launched_at.isoformat()
        if isinstance(history.launched_at, datetime)
        else now.isoformat()
    )

    # Add to ChromaDB trip_history collection
    try:
        vector_service.add_history_entry(
            history_id=history.id,
            trip_id=trip.id,
            trip_name=trip.name,
            stops=stops_snapshot,
            launched_at=launched_at_str,
            user_id=user_id,
        )
    except Exception as exc:
        logger.error(
            "Failed to add history entry to ChromaDB for history_id=%s: %s",
            history.id,
            exc,
        )

    # Calculate total miles for the trip and store in history
    try:
        total_miles = await directions_service.calculate_route_miles(stops_snapshot)
        history.total_miles = total_miles
    except Exception as exc2:
        logger.error("Failed to calculate total miles for history_id=%s: %s", history.id, exc2)
        history.total_miles = 0.0

    db.commit()
    db.refresh(history)
    return history


