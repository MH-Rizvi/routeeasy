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
    Implements a 1-strike immediate rotation dropping models on 429/503 errors natively.
    """

    def __init__(self) -> None:
        groq_keys = settings.groq_api_keys
        gemini_keys = settings.gemini_api_keys
        
        self._keys: List[Tuple[str, str]] = [("groq", k) for k in groq_keys] + [("gemini", k) for k in gemini_keys]
        
        if not self._keys:
            raise RuntimeError("No API keys configured. Set GROQ_API_KEY or GEMINI_API_KEY in .env")

        self.groq_models = [
            "llama-3.3-70b-versatile",
            "meta-llama/llama-4-maverick-17b-128e-instruct",
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "moonshotai/kimi-k2-instruct",
            "qwen/qwen3-32b",
            "llama-3.1-8b-instant"
        ]
            
        self._current_key_idx: int = 0
        self._current_model_idx: int = 0
        
        # Tracks timestamp of exhausted combinations: (key, model) -> time.time()
        self._exhausted_combos: dict[tuple[str, str], float] = {}
        self.cooldown_seconds = 60.0

        logger.info(
            "LLMKeyRotator initialised with %d key(s) (%d Groq, %d Gemini)",
            len(self._keys), len(groq_keys), len(gemini_keys)
        )

    @property
    def current_provider(self) -> str:
        return self._keys[self._current_key_idx][0]

    @property
    def current_key(self) -> str:
        return self._keys[self._current_key_idx][1]

    @property
    def current_model(self) -> str:
        if self.current_provider == "groq":
            return self.groq_models[self._current_model_idx]
        return "gemini-2.0-flash-lite"

    @property
    def key_count(self) -> int:
        return len(self._keys)

    def is_exhausted(self, key: str, model: str) -> bool:
        """Check if this combination is in cooldown."""
        import time
        if (key, model) in self._exhausted_combos:
            if time.time() - self._exhausted_combos[(key, model)] > self.cooldown_seconds:
                del self._exhausted_combos[(key, model)]
                return False
            return True
        return False

    def advance_on_failure(self) -> bool:
        """
        Record the current Model + Key as exhausted natively, and immediately roll forward.
        Returns True if a new valid combination was found, False if all are exhausted.
        """
        import time
        provider, key = self._keys[self._current_key_idx]
        model = self.current_model
        
        # Mark current mapping dead
        self._exhausted_combos[(key, model)] = time.time()
        logger.warning(f"Exhausted {provider} model {model} on key {_mask(key)}. Marking cooldown for 60s.")

        # If we are on Gemini, there are no sub-models to rotate. Jump to next key.
        if provider == "gemini":
            started = self._current_key_idx
            while True:
                self._current_key_idx = (self._current_key_idx + 1) % len(self._keys)
                if self._current_key_idx == started:
                    logger.error("ALL keys globally exhausted.")
                    return False
                if not self.is_exhausted(self.current_key, self.current_model):
                    return True

        # For Groq, scan forward on models first, then keys
        for key_offset in range(len(self._keys)):
            idx = (self._current_key_idx + key_offset) % len(self._keys)
            cand_provider, cand_key = self._keys[idx]
            
            if cand_provider == "gemini":
                # We reached gemini fallback tier
                if not self.is_exhausted(cand_key, "gemini-2.0-flash-lite"):
                    self._current_key_idx = idx
                    self._current_model_idx = 0
                    logger.warning("Fell back to Gemini natively.")
                    return True
                continue

            # It's a Groq key: search its models
            start_model = (self._current_model_idx + 1) if key_offset == 0 else 0
            
            for m_offset in range(len(self.groq_models)):
                cand_m_idx = (start_model + m_offset) % len(self.groq_models)
                cand_model = self.groq_models[cand_m_idx]
                
                if not self.is_exhausted(cand_key, cand_model):
                    self._current_key_idx = idx
                    self._current_model_idx = cand_m_idx
                    logger.info(f"Rotated -> Provider: {cand_provider}, Model: {cand_model}, Key: {_mask(cand_key)}")
                    return True
                    
        logger.error("ALL keys and ALL models are currently exhausted! Awaiting 60s cooldowns.")
        return False

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

        # Convert simple chat dicts to proper LangChain format
        lc_messages = []
        for m in messages:
            if m["role"] == "system": lc_messages.append(("system", m["content"]))
            elif m["role"] == "user": lc_messages.append(("user", m["content"]))
            elif m["role"] == "assistant": lc_messages.append(("assistant", m["content"]))

        while True:
            try:
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
                exc_str = str(exc).lower()

                if "generaterequestsperday" in exc_str:
                    logger.error("Daily quota exhausted. Stopping all retries immediately.")
                    break

                if not _is_rate_limit_error(exc):
                    raise
                    
                # 1-strike immediate rotation
                logger.warning(f"RAG Endpoint Encountered Rate Limit: {str(exc)[:80]}")
                found_next = self.advance_on_failure()
                if not found_next:
                    logger.error("All RAG fallback models exhausted.")
                    break
                continue

        raise RuntimeError("I'm a bit busy right now, please try again in a moment")

    # ── LangChain LLM Factory ────────────────────────

    def get_chat_llm(self, **kwargs: Any) -> Any:
        # Ignore external model overrides and enforce internal state tracking targets
        kwargs.pop("model", None)
        
        if self.current_provider == "groq":
            defaults = {"model": self.current_model, "temperature": 0, "model_kwargs": {"top_p": 0.1}}
            defaults.update(kwargs)
            return ChatGroq(api_key=self.current_key, **defaults)
        else:
            defaults = {"model": self.current_model, "temperature": 0, "top_p": 0.1}
            defaults.update(kwargs)
            if "max_tokens" in defaults:
                defaults["max_output_tokens"] = defaults.pop("max_tokens")
            return ChatGoogleGenerativeAI(google_api_key=self.current_key, **defaults)



# ── Module-level singleton ────────────────────────────────────────────
groq_rotator = LLMKeyRotator()
