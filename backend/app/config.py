
from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables (.env)."""

    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    groq_api_key_1: Optional[str] = Field(default=None, env="GROQ_API_KEY_1")
    groq_api_key_2: Optional[str] = Field(default=None, env="GROQ_API_KEY_2")
    groq_api_key_3: Optional[str] = Field(default=None, env="GROQ_API_KEY_3")

    google_maps_api_key: str | None = Field(default=None, env="GOOGLE_MAPS_API_KEY")

    database_url: str = Field(
        default="sqlite:///./routeeasy.db",
        env="DATABASE_URL",
    )
    chroma_db_path: str = Field(
        default="./chroma_db",
        env="CHROMA_DB_PATH",
    )

    default_city: str = Field(
        default="New York, NY",
        env="DEFAULT_CITY",
    )

    cors_origins: List[AnyHttpUrl] | List[str] = Field(
        default_factory=lambda: ["http://localhost:5173"],
        env="CORS_ORIGINS",
    )

    active_prompt_version: str = Field(
        default="agent_v1",
        env="ACTIVE_PROMPT_VERSION",
    )

    @property
    def groq_api_keys(self) -> List[str]:
        """Return all available Groq API keys, deduplicated, preserving order."""
        candidates = [
            self.groq_api_key_1,
            self.groq_api_key_2,
            self.groq_api_key_3,
            self.groq_api_key,  # fallback is always last
        ]
        seen: set[str] = set()
        keys: List[str] = []
        for k in candidates:
            if k and k.strip() and k.strip() not in seen:
                seen.add(k.strip())
                keys.append(k.strip())
        return keys

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance so we only load env once."""
    return Settings()


settings = get_settings()
