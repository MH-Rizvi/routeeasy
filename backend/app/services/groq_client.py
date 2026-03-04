"""
Groq and Gemini API key rotation wrapper.

Manages multiple API keys and automatically rotates to the next available key 
(falling back from Groq to Gemini) when a rate-limit error is encountered.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, List, Tuple

from langchain_groq import ChatGroq  # pyright: ignore[reportMissingImports]
from langchain_google_genai import ChatGoogleGenerativeAI  # pyright: ignore[reportMissingImports]

from app.config import settings

logger = logging.getLogger(__name__)


def _mask(key: str) -> str:
    """Return last 4 chars of a key for safe logging."""
    return f"...{key[-4:]}" if len(key) >= 4 else "***"


def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if an exception is a rate-limit / daily-limit / capacity error."""
    exc_type = type(exc).__name__
    if "RateLimitError" in exc_type or "ResourceExhausted" in exc_type or "InternalServerError" in exc_type or "APIStatusError" in exc_type:
        return True
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("rate_limit", "rate limit", "429", "503", "500", "502", "504", "daily limit", "token limit", "tokens_remaining", "quota exceeded", "resource exhausted", "capacity", "overloaded", "service unavailable", "internal server error")
    )


class DummyUsage:
    def __init__(self, prompt_tokens: int, completion_tokens: int):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens

class DummyMessage:
    def __init__(self, content: str):
        self.content = content

class DummyChoice:
    def __init__(self, content: str):
        self.message = DummyMessage(content)

class DummyResponse:
    def __init__(self, content: str, prompt_tokens: int = 0, completion_tokens: int = 0):
        self.choices = [DummyChoice(content)]
        self.usage = DummyUsage(prompt_tokens, completion_tokens)


class LLMKeyRotator:
    """
    Maintains a pool of LLM API keys (Groq first, then Gemini fallback).
    """

    def __init__(self) -> None:
        groq_keys = settings.groq_api_keys
        gemini_keys = settings.gemini_api_keys
        
        self._keys: List[Tuple[str, str]] = [("groq", k) for k in groq_keys] + [("gemini", k) for k in gemini_keys]
        
        if not self._keys:
            raise RuntimeError("No API keys configured. Set GROQ_API_KEY or GEMINI_API_KEY in .env")
            
        self._current_index: int = 0
        logger.info(
            "LLMKeyRotator initialised with %d key(s) (%d Groq, %d Gemini)",
            len(self._keys), len(groq_keys), len(gemini_keys)
        )

    @property
    def current_provider(self) -> str:
        return self._keys[self._current_index][0]

    @property
    def current_key(self) -> str:
        return self._keys[self._current_index][1]

    @property
    def key_count(self) -> int:
        return len(self._keys)

    def _rotate(self) -> bool:
        """Move to the next key in the pool."""
        next_index = (self._current_index + 1) % len(self._keys)
        if next_index == self._current_index and len(self._keys) == 1:
            logger.warning("Only 1 key available — cannot rotate")
            return False
        self._current_index = next_index
        logger.info(
            "Rotated to %s key %d/%d (%s)",
            self.current_provider.title(),
            self._current_index + 1,
            len(self._keys),
            _mask(self.current_key),
        )
        return True

    # ── Legacy Async wrapper for RAG service ─────────

    async def async_chat_completion(
        self,
        *,
        messages: list,
        model: str = "llama-3.3-70b-versatile",
        max_tokens: int = 300,
        **kwargs: Any,
    ) -> Any:
        """
        Mimics Groq async chat completion but uses LangChain under the hood
        so it seamlessly falls back to Gemini.
        """
        last_exc: Exception | None = None
        groq_keys_tried = 1
        groq_key_retries = 0
        gemini_keys_tried = 1
        gemini_key_retries = 0

        # Convert simple chat dicts to proper LangChain format
        lc_messages = []
        for m in messages:
            if m["role"] == "system": lc_messages.append(("system", m["content"]))
            elif m["role"] == "user": lc_messages.append(("user", m["content"]))
            elif m["role"] == "assistant": lc_messages.append(("assistant", m["content"]))

        while True:
            try:
                # Discard Groq-specific 'model' internally to use the provider default
                llm = self.get_chat_llm(max_tokens=max_tokens, **kwargs)
                response = await llm.ainvoke(lc_messages)
                
                pt = 0
                ct = 0
                if "token_usage" in response.response_metadata:
                    pt = response.response_metadata["token_usage"].get("prompt_tokens", 0)
                    ct = response.response_metadata["token_usage"].get("completion_tokens", 0)
                    
                return DummyResponse(response.content, pt, ct)
                
            except Exception as exc:
                last_exc = exc
                if not _is_rate_limit_error(exc):
                    raise
                    
                provider = self.current_provider
                
                if provider == "groq":
                    if groq_key_retries < 1:
                        groq_key_retries += 1
                        logger.warning("Groq rate limit on current key, retry %d/1: %s", groq_key_retries, str(exc)[:80])
                        continue
                    else:
                        num_groq_keys = sum(1 for p, k in self._keys if p == "groq")
                        if groq_keys_tried < num_groq_keys:
                            groq_keys_tried += 1
                            logger.warning("Groq key exhausted, rotating to next Groq key (%d/%d)", groq_keys_tried, num_groq_keys)
                            self._rotate()
                            groq_key_retries = 0
                            continue
                        else:
                            logger.warning("All Groq keys exhausted, forcing Gemini fallback")
                            rotated = False
                            for _ in range(self.key_count):
                                self._rotate()
                                if self.current_provider == "gemini":
                                    rotated = True
                                    break
                            if not rotated:
                                break
                            continue
                else:
                    num_gemini_keys = sum(1 for p, k in self._keys if p == "gemini")
                    exc_str = str(exc).lower()
                    
                    # Hard fail across all keys if daily quota is exhausted
                    if "generaterequestsperday" in exc_str:
                        logger.error("Gemini daily quota exhausted. Stopping all retries immediately.")
                        break

                    should_fail_fast = "quota" in exc_str or "429" in exc_str or "resourceexhausted" in exc_str
                    
                    if not should_fail_fast and gemini_key_retries < 1:
                        gemini_key_retries += 1
                        logger.warning("Gemini rate limit, retry %d/1. Waiting 30s...", gemini_key_retries)
                        await asyncio.sleep(30)
                        continue
                    else:
                        if should_fail_fast:
                            logger.warning("Gemini quota exhausted, failing fast to next key.")
                        else:
                            logger.warning("Gemini retries exhausted for this key.")
                            
                        if gemini_keys_tried < num_gemini_keys:
                            gemini_keys_tried += 1
                            logger.warning("Rotating to next Gemini key (%d/%d)", gemini_keys_tried, num_gemini_keys)
                            self._rotate()
                            gemini_key_retries = 0
                            continue
                        else:
                            logger.warning("All Gemini keys exhausted.")
                            break

        raise RuntimeError("I'm a bit busy right now, please try again in a moment")

    # ── LangChain LLM Factory ────────────────────────

    def get_chat_llm(self, **kwargs: Any) -> Any:
        """Return either ChatGroq or ChatGoogleGenerativeAI based on current active key."""
        if self.current_provider == "groq":
            defaults = {"model": "llama-3.3-70b-versatile", "temperature": 0, "model_kwargs": {"top_p": 0.1}}
            defaults.update(kwargs)
            return ChatGroq(api_key=self.current_key, **defaults)
        else:
            defaults = {"model": "gemini-2.0-flash-lite", "temperature": 0, "top_p": 0.1}
            # Remove model from kwargs since callers pass Groq models like "llama..."
            if "model" in kwargs:
                kwargs.pop("model")
            defaults.update(kwargs)
            # Remove unsupported max_tokens for Gemini to prevent errors, use max_output_tokens
            if "max_tokens" in defaults:
                defaults["max_output_tokens"] = defaults.pop("max_tokens")
            return ChatGoogleGenerativeAI(google_api_key=self.current_key, **defaults)

    # Backwards compatibility for core.py
    def get_chat_groq(self, **kwargs: Any) -> Any:
        return self.get_chat_llm(**kwargs)

    def refresh_chat_groq(self, **kwargs: Any) -> Any:
        self._rotate()
        return self.get_chat_llm(**kwargs)


# ── Module-level singleton ────────────────────────────────────────────
groq_rotator = LLMKeyRotator()
