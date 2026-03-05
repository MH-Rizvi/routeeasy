
from __future__ import annotations

import sqlite3
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


SQLALCHEMY_DATABASE_URL = settings.database_url


if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"sslmode": "require"})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """Provide a SQLAlchemy session to FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


