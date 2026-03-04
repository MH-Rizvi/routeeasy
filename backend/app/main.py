
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


logger = logging.getLogger(__name__)

app = FastAPI(
    title="Routigo API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5173",
        "https://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://127.0.0.1:5173",
        "https://127.0.0.1:5174",
        "http://192.168.1.168:5174",
        "https://192.168.1.168:5174",
        "http://172.21.224.1:5174",
        "https://172.21.224.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all so that unhandled errors still carry CORS headers."""
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers={"Access-Control-Allow-Origin": "*"},
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
