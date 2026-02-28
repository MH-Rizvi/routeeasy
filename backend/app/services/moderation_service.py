
from __future__ import annotations

import logging
import re


logger = logging.getLogger(__name__)

# ── Fast allowlist — these always pass without an LLM call ────────────
_GREETING_WORDS = {
    "hi", "hey", "hello", "howdy", "hiya", "yo",
    "good morning", "good afternoon", "good evening",
    "morning", "afternoon", "evening",
    "whats up", "what's up", "sup",
}

_CONFIRMATION_WORDS = {
    "yes", "yeah", "yep", "yup", "sure", "ok", "okay", "k",
    "no", "nah", "nope", "not really",
    "sounds good", "perfect", "great", "awesome", "cool",
    "go ahead", "do it", "proceed", "confirm", "confirmed",
    "correct", "right", "exactly", "that works",
    "no thanks", "no thank you", "not now",
}

_THANKS_WORDS = {
    "thanks", "thank you", "thx", "ty", "cheers",
    "thanks a lot", "thank you so much", "much appreciated",
}

_AUTO_SAFE = _GREETING_WORDS | _CONFIRMATION_WORDS | _THANKS_WORDS

# Patterns that are genuinely dangerous — prompt injection attempts
_BLOCK_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignore\s+(all\s+)?prior\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior|above)",
    r"you\s+are\s+now\s+(?:a|an)\s+(?!route|bus|driver)",
    r"system\s*prompt",
    r"jailbreak",
]


async def is_safe(user_input: str) -> bool:
    """
    Return True if the input is considered safe for the route-planning agent.

    Uses a three-tier strategy:
    1. Empty → reject
    2. Allowlist match or short message (≤3 words) → auto-approve
    3. Block-pattern match → reject
    4. Fallback: default to SAFE (only the agent system prompt politely
       redirects off-topic questions, not the moderation layer)
    """
    stripped = user_input.strip()
    if not stripped:
        return False

    normalised = stripped.lower().rstrip("!?.,")

    # Tier 1 — fast allowlist
    if normalised in _AUTO_SAFE:
        return True

    # Tier 2 — any short message (≤ 3 words) is fine
    if len(normalised.split()) <= 3:
        return True

    # Tier 3 — block obvious prompt injections
    for pattern in _BLOCK_PATTERNS:
        if re.search(pattern, normalised, re.IGNORECASE):
            logger.warning("Blocked by injection pattern: %s", stripped[:80])
            return False

    # Tier 4 — everything else is safe; the agent prompt handles off-topic
    return True
