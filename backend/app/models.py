
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    birthday: Mapped[str | None] = mapped_column(String, nullable=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    profile: Mapped["UserProfile"] = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    trips: Mapped[list["Trip"]] = relationship(
        "Trip", back_populates="user", cascade="all, delete-orphan"
    )
    stops: Mapped[list["Stop"]] = relationship(
        "Stop", back_populates="user", cascade="all, delete-orphan"
    )
    histories: Mapped[list["TripHistory"]] = relationship(
        "TripHistory", back_populates="user", cascade="all, delete-orphan"
    )
    llm_logs: Mapped[list["LLMLog"]] = relationship(
        "LLMLog", back_populates="user", cascade="all, delete-orphan"
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    city: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    zip_code: Mapped[str] = mapped_column(String, nullable=False)
    full_location: Mapped[str] = mapped_column(String, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="profile")


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    chroma_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )
    last_used: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    use_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="trips")
    stops: Mapped[list["Stop"]] = relationship(
        "Stop",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="Stop.position",
    )
    histories: Mapped[list["TripHistory"]] = relationship(
        "TripHistory",
        back_populates="trip",
        passive_deletes=True,
    )


class Stop(Base):
    __tablename__ = "stops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trip_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    chroma_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)

    user: Mapped["User"] = relationship("User", back_populates="stops")
    trip: Mapped["Trip"] = relationship("Trip", back_populates="stops")


class TripHistory(Base):
    __tablename__ = "trip_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trip_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    trip_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_input: Mapped[str | None] = mapped_column(Text, nullable=True)
    stops_json: Mapped[str] = mapped_column(Text, nullable=False)
    launched_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )
    total_miles: Mapped[float] = mapped_column(Float, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="histories")
    trip: Mapped["Trip | None"] = relationship("Trip", back_populates="histories")


class LLMLog(Base):
    __tablename__ = "llm_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )
    model: Mapped[str] = mapped_column(String, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String, nullable=False)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    run_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)

    user: Mapped["User | None"] = relationship("User", back_populates="llm_logs")


