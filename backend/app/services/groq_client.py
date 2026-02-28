"""
Groq API key rotation wrapper.

Manages multiple Groq API keys and automatically rotates to the next
available key when a rate-limit error (429 / daily limit) is encountered.
"""

from __future__ import annotations

import logging
from typing import Any, List

from groq import AsyncGroq  # pyright: ignore[reportMissingImports]
from langchain_groq import ChatGroq  # pyright: ignore[reportMissingImports]

from app.config import settings

logger = logging.getLogger(__name__)


def _mask(key: str) -> str:
    """Return last 4 chars of a key for safe logging."""
    return f"...{key[-4:]}" if len(key) >= 4 else "***"


def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if an exception is a Groq rate-limit / daily-limit error."""
    exc_type = type(exc).__name__
    if "RateLimitError" in exc_type:
        return True
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("rate_limit", "rate limit", "429", "daily limit", "token limit", "tokens_remaining")
    )


class GroqKeyRotator:
    """
    Maintains a pool of Groq API keys and cycles through them.

    Usage:
        rotator = GroqKeyRotator()
        # For raw AsyncGroq calls:
        result = await rotator.async_chat_completion(messages=[...], model="...", **kwargs)

        # For LangChain ChatGroq (agent):
        llm = rotator.get_chat_groq(model="...", temperature=0)
    """

    def __init__(self) -> None:
        self._keys: List[str] = settings.groq_api_keys
        if not self._keys:
            raise RuntimeError("No Groq API keys configured. Set GROQ_API_KEY in .env")
        self._current_index: int = 0
        logger.info(
            "GroqKeyRotator initialised with %d key(s): %s",
            len(self._keys),
            ", ".join(_mask(k) for k in self._keys),
        )

    @property
    def current_key(self) -> str:
        return self._keys[self._current_index]

    @property
    def key_count(self) -> int:
        return len(self._keys)

    def _rotate(self) -> bool:
        """
        Move to the next key in the pool.
        Returns True if a new key is available, False if we've cycled through all.
        """
        next_index = (self._current_index + 1) % len(self._keys)
        if next_index == self._current_index and len(self._keys) == 1:
            logger.warning("Only 1 key available — cannot rotate")
            return False
        self._current_index = next_index
        logger.info(
            "Rotated to Groq key %d/%d (%s)",
            self._current_index + 1,
            len(self._keys),
            _mask(self.current_key),
        )
        return True

    # ── AsyncGroq wrapper (for rag_service, moderation, etc.) ─────────

    def _get_async_client(self) -> AsyncGroq:
        """Create an AsyncGroq client with the current key."""
        return AsyncGroq(api_key=self.current_key)

    async def async_chat_completion(
        self,
        *,
        messages: list,
        model: str = "llama-3.3-70b-versatile",
        max_tokens: int = 300,
        **kwargs: Any,
    ) -> Any:
        """
        Make an async chat completion call, rotating keys on rate-limit errors.
        Tries each key once. If all keys are exhausted, raises the last error.
        """
        last_exc: Exception | None = None
        tried = 0

        while tried < len(self._keys):
            client = self._get_async_client()
            logger.debug(
                "Groq call using key %d/%d (%s)",
                self._current_index + 1,
                len(self._keys),
                _mask(self.current_key),
            )
            try:
                return await client.chat.completions.create(
                    model=model,
                    max_tokens=max_tokens,
                    messages=messages,
                    **kwargs,
                )
            except Exception as exc:
                last_exc = exc
                if _is_rate_limit_error(exc):
                    logger.warning(
                        "Rate limit on key %d/%d (%s): %s",
                        self._current_index + 1,
                        len(self._keys),
                        _mask(self.current_key),
                        str(exc)[:120],
                    )
                    tried += 1
                    if tried < len(self._keys):
                        self._rotate()
                        continue
                    # All keys exhausted
                    break
                else:
                    # Non-rate-limit error — don't rotate, just raise
                    raise

        # All keys exhausted — raise a clear error
        raise RuntimeError(
            "All Groq API keys have been rate-limited. "
            "I'm taking a short break — please try again in a few minutes."
        ) from last_exc

    # ── LangChain ChatGroq wrapper (for agent) ────────────────────────

    def get_chat_groq(self, **kwargs: Any) -> ChatGroq:
        """
        Return a ChatGroq instance using the current key.
        Note: LangChain manages its own retries internally, so this just
        provides the active key. Call refresh_chat_groq() after rotation.
        """
        defaults = {
            "model": "llama-3.3-70b-versatile",
            "temperature": 0,
        }
        defaults.update(kwargs)
        return ChatGroq(api_key=self.current_key, **defaults)

    def refresh_chat_groq(self, **kwargs: Any) -> ChatGroq:
        """Rotate key and return a new ChatGroq instance."""
        self._rotate()
        return self.get_chat_groq(**kwargs)


# ── Module-level singleton ────────────────────────────────────────────
groq_rotator = GroqKeyRotator()
