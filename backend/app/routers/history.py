
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import Session  # pyright: ignore[reportMissingImports]

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.services import vector_service


router = APIRouter(tags=["history"])


@router.get("/history", response_model=schemas.HistoryListResponse)
async def list_history(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.HistoryListResponse:
    cutoff = datetime.utcnow() - timedelta(days=days)

    histories: List[models.TripHistory] = (
        db.query(models.TripHistory)
        .filter(models.TripHistory.user_id == current_user.id)
        .filter(models.TripHistory.launched_at >= cutoff)
        .order_by(models.TripHistory.launched_at.desc())
        .all()
    )

    return schemas.HistoryListResponse(items=histories)


@router.delete("/history/{history_id}")
async def delete_history_entry(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    history_entry = (
        db.query(models.TripHistory)
        .filter(models.TripHistory.id == history_id)
        .filter(models.TripHistory.user_id == current_user.id)
        .first()
    )
    if history_entry:
        db.delete(history_entry)
        db.commit()
        vector_service.delete_history_entry(f"history_{history_id}", current_user.id)
    return {"status": "ok"}


@router.delete("/history")
async def clear_all_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.query(models.TripHistory).filter(models.TripHistory.user_id == current_user.id).delete()
    db.commit()
    vector_service.clear_history(current_user.id)
    return {"status": "ok"}


