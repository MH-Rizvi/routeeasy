"""
Sync ChromaDB with SQL source of truth.
Purges any ChromaDB vectors for users/entries that no longer exist in SQL.
Run at application startup to ensure consistency.
"""
from __future__ import annotations

import logging

from app.database import SessionLocal
from app import models
from app.services.vector_service import (
    chroma_client,
    _get_history_collection,
    _get_trips_collection,
    _get_stops_collection,
)

logger = logging.getLogger(__name__)


def sync_chroma_with_sql() -> None:
    """
    Ensure ChromaDB collections only contain data that exists in the SQL database.
    This handles the case where SQL tables were wiped but ChromaDB was not.
    """
    db = SessionLocal()
    try:
        # Get all user_ids that have collections
        collections = chroma_client.list_collections()
        user_ids_with_collections: set[int] = set()
        for coll in collections:
            name = coll.name
            for prefix in ("history_", "trips_", "stops_"):
                if name.startswith(prefix):
                    try:
                        uid = int(name[len(prefix):])
                        user_ids_with_collections.add(uid)
                    except ValueError:
                        pass

        for user_id in user_ids_with_collections:
            # Check if user exists in SQL
            user_exists = db.query(models.User).filter(models.User.id == user_id).first() is not None

            if not user_exists:
                # User deleted — purge all their ChromaDB collections
                logger.warning("sync_chroma | User %d no longer exists — purging all vectors", user_id)
                for prefix in ("history_", "trips_", "stops_"):
                    coll_name = f"{prefix}{user_id}"
                    try:
                        coll = chroma_client.get_collection(name=coll_name)
                        count = coll.count()
                        if count > 0:
                            all_ids = coll.get()["ids"]
                            coll.delete(ids=all_ids)
                            logger.warning("  Purged %d docs from %s", count, coll_name)
                    except Exception:
                        pass
                continue

            # User exists — check if their SQL data matches ChromaDB
            sql_history_count = db.query(models.TripHistory).filter(
                models.TripHistory.user_id == user_id
            ).count()
            sql_trips_count = db.query(models.Trip).filter(
                models.Trip.user_id == user_id
            ).count()
            sql_stops_count = db.query(models.Stop).filter(
                models.Stop.trip_id.in_(
                    db.query(models.Trip.id).filter(models.Trip.user_id == user_id)
                )
            ).count()

            # If SQL has zero data but ChromaDB has data, purge ChromaDB
            hist_coll = _get_history_collection(user_id)
            if sql_history_count == 0 and hist_coll.count() > 0:
                all_ids = hist_coll.get()["ids"]
                if all_ids:
                    hist_coll.delete(ids=all_ids)
                    logger.warning("sync_chroma | Purged %d stale history vectors for user %d", len(all_ids), user_id)

            trips_coll = _get_trips_collection(user_id)
            if sql_trips_count == 0 and trips_coll.count() > 0:
                all_ids = trips_coll.get()["ids"]
                if all_ids:
                    trips_coll.delete(ids=all_ids)
                    logger.warning("sync_chroma | Purged %d stale trip vectors for user %d", len(all_ids), user_id)

            stops_coll = _get_stops_collection(user_id)
            if sql_stops_count == 0 and stops_coll.count() > 0:
                all_ids = stops_coll.get()["ids"]
                if all_ids:
                    stops_coll.delete(ids=all_ids)
                    logger.warning("sync_chroma | Purged %d stale stop vectors for user %d", len(all_ids), user_id)

        logger.info("sync_chroma | ChromaDB ↔ SQL sync complete")
    except Exception as exc:
        logger.error("sync_chroma | Error during sync: %s", exc)
    finally:
        db.close()
