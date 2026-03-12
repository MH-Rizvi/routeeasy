
from __future__ import annotations

import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    stream=sys.stdout,
)

from fastapi import FastAPI, Request  # pyright: ignore[reportMissingImports]
from fastapi.exceptions import RequestValidationError  # pyright: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware  # pyright: ignore[reportMissingImports]
from fastapi.responses import JSONResponse  # pyright: ignore[reportMissingImports]

from app.agent import core as agent_core  # noqa: F401  # ensure agent modules are imported
from app.config import settings
from app.database import Base, engine
from app.routers import agent, trips, history, rag, admin, voice, auth, stats, places, directions
from app.services import vector_service  # noqa: F401  # ensure collections are created
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.rate_limit import limiter
from app.routers import compliance


logger = logging.getLogger(__name__)

app = FastAPI(
    title="RoutAura API",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log the exact validation error details for debugging 422s."""
    logger.error(
        "422 Validation Error on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


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
    if origin:
        # Always reflect back the requesting origin + credentials
        # so the browser doesn't swallow the error silently
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
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
app.include_router(directions.router, prefix="/api/v1")
app.include_router(compliance.router, prefix="/api/v1")
