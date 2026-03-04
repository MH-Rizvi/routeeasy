
from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import Session  # pyright: ignore[reportMissingImports]

from app import models, schemas
from app.agent import core as agent_service
from app.auth import get_current_user
from app.database import get_db
from app.services import moderation_service


logger = logging.getLogger(__name__)
router = APIRouter(tags=["agent"])

# ── Demo endpoint rate limiter (in-memory, 10 req/IP/hour) ──────────
_demo_rate: dict[str, list[float]] = defaultdict(list)
DEMO_RATE_LIMIT = 10
DEMO_RATE_WINDOW = 3600  # 1 hour in seconds


def _check_demo_rate(ip: str) -> bool:
    """Return True if the IP is within the rate limit."""
    now = time.time()
    # Prune old timestamps
    _demo_rate[ip] = [t for t in _demo_rate[ip] if now - t < DEMO_RATE_WINDOW]
    if len(_demo_rate[ip]) >= DEMO_RATE_LIMIT:
        return False
    _demo_rate[ip].append(now)
    return True


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
        # Read user_city fresh from the database on every request to ensure it reflects recent profile updates
        profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
        user_city = profile.full_location if profile else ""
        
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


@router.post("/agent/demo-chat", response_model=schemas.AgentChatResponse)
async def demo_chat(
    request: schemas.DemoChatRequest,
    http_request: Request,
    db: Session = Depends(get_db),
) -> schemas.AgentChatResponse:
    """Public demo endpoint — no auth required, rate-limited."""
    client_ip = http_request.client.host if http_request.client else "unknown"
    if not _check_demo_rate(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo rate limit reached. Sign up for unlimited access!",
        )

    is_safe = await moderation_service.is_safe(request.message)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message not related to route planning.",
        )

    try:
        result: dict[str, Any] = await agent_service.run_agent(
            request.message,
            request.conversation_history,  # pyright: ignore[reportArgumentType]
            db,
            user_id=0,
            user_city="Hicksville, NY",
        )

        # Intercept save_trip attempts — demo users cannot save
        reply_text = result.get("reply", "")
        if "saved trip" in reply_text.lower() or "successfully saved" in reply_text.lower():
            return schemas.AgentChatResponse(
                reply="Create a free account to save and launch your routes!",
                stops=result.get("stops", []),
                requires_auth=True,
            )

        return schemas.AgentChatResponse(**result)
    except Exception as exc:
        logger.exception("Demo agent error: %s", exc)
        return schemas.AgentChatResponse(
            reply="Something went wrong. Please try again.",
        )
