
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import Session  # pyright: ignore[reportMissingImports]

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db


router = APIRouter(tags=["admin"])


@router.get("/admin/llm-logs", response_model=schemas.LLMLogListResponse)
async def get_llm_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.LLMLogListResponse:
    logs: List[models.LLMLog] = (
        db.query(models.LLMLog)
        .filter(models.LLMLog.user_id == current_user.id)
        .order_by(models.LLMLog.timestamp.desc())
        .all()
    )
    return schemas.LLMLogListResponse(items=logs, total=len(logs))  # pyright: ignore[reportArgumentType]


@router.get("/admin/chroma-debug")
async def chroma_debug(
    current_user: models.User = Depends(get_current_user),
):
    """Debug: show all ChromaDB collections and their document counts."""
    from app.services.vector_service import chroma_client

    collections = chroma_client.list_collections()
    result = []
    for coll in sorted(collections, key=lambda c: c.name):
        count = coll.count()
        docs = []
        if count > 0:
            data = coll.get(limit=10, include=["documents"])
            docs = data.get("documents", [])[:5]
        result.append({
            "name": coll.name,
            "count": count,
            "sample_docs": docs,
        })
    return {"user_id": current_user.id, "collections": result}

