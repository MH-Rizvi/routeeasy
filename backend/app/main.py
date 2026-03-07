
from __future__ import annotations

import logging

from fastapi import FastAPI, Request  # pyright: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware  # pyright: ignore[reportMissingImports]
from fastapi.responses import JSONResponse  # pyright: ignore[reportMissingImports]

from app.agent import core as agent_core  # noqa: F401  # ensure agent modules are imported
from app.config import settings
from app.database import Base, engine
from app.routers import agent, trips, history, rag, admin, voice, auth, stats, places
from app.services import vector_service  # noqa: F401  # ensure collections are created
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.rate_limit import limiter


logger = logging.getLogger(__name__)

app = FastAPI(
    title="Routigo API",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all so that unhandled errors still carry CORS headers."""
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in settings.cors_origins or "*" in settings.cors_origins):
        headers["Access-Control-Allow-Origin"] = origin
        
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers=headers,
    )


@app.on_event("startup")
async def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    _ = vector_service  # noqa: F841

    # Purge any stale ChromaDB vectors that don't match SQL
    from app.services.chroma_sync import sync_chroma_with_sql
    sync_chroma_with_sql()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(agent.router, prefix="/api/v1")
app.include_router(trips.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(rag.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(voice.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(stats.router, prefix="/api/v1")
app.include_router(places.router, prefix="/api/v1")
