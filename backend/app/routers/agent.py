
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import Session  # pyright: ignore[reportMissingImports]

from app import models, schemas
from app.agent import core as agent_service
from app.auth import get_current_user
from app.database import get_db
from app.services import moderation_service


logger = logging.getLogger(__name__)
router = APIRouter(tags=["agent"])


@router.post("/agent/chat", response_model=schemas.AgentChatResponse)
async def chat(
    request: schemas.AgentChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.AgentChatResponse:
    is_safe = await moderation_service.is_safe(request.message)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message not related to route planning.",
        )

    try:
        user_city = current_user.profile.full_location if current_user.profile else ""
        result: dict[str, Any] = await agent_service.run_agent(
            request.message,
            request.conversation_history,  # pyright: ignore[reportArgumentType]
            db,
            user_id=current_user.id,
            user_city=user_city,
        )
        return schemas.AgentChatResponse(**result)
    except Exception as exc:
        # Log the full error but return a friendly message
        logger.exception("Agent error: %s", exc)
        error_msg = str(exc)
        if "rate_limit" in error_msg.lower():
            reply = "The AI service is temporarily busy (rate limit reached). Please wait 30 seconds and try again."
        elif "iteration limit" in error_msg.lower() or "time limit" in error_msg.lower():
            reply = "The route took too long to process. Please try a simpler description."
        else:
            reply = "Something went wrong while processing your route. Please try again."
        return schemas.AgentChatResponse(reply=reply)
