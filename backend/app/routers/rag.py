
from __future__ import annotations

from fastapi import APIRouter, Depends  # pyright: ignore[reportMissingImports]

from app import models, schemas
from app.auth import get_current_user
from app.services import rag_service


router = APIRouter(tags=["rag"])


@router.post("/rag/query", response_model=schemas.HistoryQuestionResponse)
async def ask_history_question(
    request: schemas.HistoryQuestionRequest,
    current_user: models.User = Depends(get_current_user),
) -> schemas.HistoryQuestionResponse:
    """
    Ask a natural language question about the driver's trip history using the RAG pipeline.
    """
    result = await rag_service.answer_history_question(request.question, current_user.id)  # pyright: ignore[reportAttributeAccessIssue]
    # Expect rag_service to return a dict with answer and sources_used.
    return schemas.HistoryQuestionResponse(**result)


