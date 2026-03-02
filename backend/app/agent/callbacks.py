
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from langchain.callbacks.base import BaseCallbackHandler  # pyright: ignore[reportMissingImports]

from app.config import settings
from app.database import SessionLocal
from app import models
from app.agent.tools import user_id_ctx, user_city_ctx

logger = logging.getLogger(__name__)

class ContextCallbackHandler(BaseCallbackHandler):
    """Sets context variables at the start of an LLM chain so tools can read them."""
    
    def __init__(self, user_id: int | None, user_city: str | None, db: Any | None):
        super().__init__()
        self.user_id = user_id
        self.user_city = user_city
        self.db = db

    def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any) -> None:
        user_id_ctx.set(self.user_id)
        user_city_ctx.set(self.user_city)


class LLMOpsCallbackHandler(BaseCallbackHandler):
    """
    Logs every LLM call to the llm_logs table for observability.

    Captures:
    - model name
    - prompt version
    - input / output tokens
    - latency in milliseconds
    - success / failure flag
    """

    def __init__(self) -> None:
        super().__init__()
        # Track start times per run_id to avoid cross-talk between concurrent runs.
        self._start_times: Dict[str, float] = {}

    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        **kwargs: Any,
    ) -> None:
        run_id = str(kwargs.get("run_id", "")) if kwargs.get("run_id") is not None else ""
        self._start_times[run_id] = time.time()

    def on_llm_end(self, response, **kwargs: Any) -> None:  # type: ignore[override]
        run_id = str(kwargs.get("run_id", "")) if kwargs.get("run_id") is not None else ""
        start_time = self._start_times.pop(run_id, None)
        if start_time is None:
            latency_ms = None
        else:
            latency_ms = int((time.time() - start_time) * 1000)

        usage = (response.llm_output or {}).get("usage", {}) if getattr(response, "llm_output", None) else {}
        input_tokens = usage.get("input_tokens")
        output_tokens = usage.get("output_tokens")

        db = SessionLocal()
        
        # Get user_id from the context set by ContextCallbackHandler
        user_id = getattr(user_id_ctx, "get", lambda: lambda: None)().get() if hasattr(user_id_ctx, "get") else None
        
        try:
            log = models.LLMLog(
                model="llama-3.3-70b-versatile",
                prompt_version=settings.active_prompt_version,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                success=True,
                error_message=None,
                run_id=run_id or None,
                user_id=user_id,
            )
            db.add(log)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to persist LLM log (success case): %s", exc)
            db.rollback()
        finally:
            db.close()

    def on_llm_error(
        self,
        error: BaseException,
        **kwargs: Any,
    ) -> None:
        db = SessionLocal()
        
        # Get user_id from the context set by ContextCallbackHandler
        user_id = getattr(user_id_ctx, "get", lambda: lambda: None)().get() if hasattr(user_id_ctx, "get") else None
        
        try:
            log = models.LLMLog(
                model="llama-3.3-70b-versatile",
                prompt_version=settings.active_prompt_version,
                input_tokens=None,
                output_tokens=None,
                latency_ms=None,
                success=False,
                error_message=str(error),
                run_id=str(kwargs.get("run_id", "")) or None,
                user_id=user_id,
            )
            db.add(log)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to persist LLM log (error case): %s", exc)
            db.rollback()
        finally:
            db.close()


