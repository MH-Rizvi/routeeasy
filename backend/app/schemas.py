
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


# ----- User / Auth schemas -----

class EmailCheckRequest(BaseModel):
    email: str

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    city: str
    state: str
    zip_code: str
    birthday: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    city: str
    state: str
    zip_code: str
    full_location: str
    birthday: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birthday: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ----- Shared / utility schemas -----


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


# ----- Stop schemas -----


class StopBase(BaseModel):
    label: str
    resolved: str
    lat: float
    lng: float
    note: Optional[str] = None
    position: int


class StopCreate(StopBase):
    pass


class StopUpdate(BaseModel):
    label: Optional[str] = None
    resolved: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: Optional[str] = None
    position: Optional[int] = None


class Stop(StopBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chroma_id: Optional[str] = None


# ----- Trip schemas -----


class TripBase(BaseModel):
    name: str
    notes: Optional[str] = None


class TripCreate(TripBase):
    stops: List[StopCreate]


class TripUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    stops: Optional[List[StopCreate]] = None


class Trip(TripBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chroma_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_used: Optional[datetime] = None
    use_count: int
    stops: List[Stop] = []


class TripSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    stop_count: int
    last_used: Optional[datetime] = None
    use_count: int


class TripSearchResult(BaseModel):
    id: int
    name: str
    stop_count: int
    similarity: float


class TripsSearchResponse(BaseModel):
    results: List[TripSearchResult]


# ----- Trip history schemas -----


class TripHistory(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: Optional[int] = None
    trip_name: Optional[str] = None
    raw_input: Optional[str] = None
    stops_json: str
    launched_at: datetime
    total_miles: Optional[float] = None


class HistoryListResponse(BaseModel):
    items: List[TripHistory]


# ----- LLM log schemas -----


class LLMLog(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    model: str
    prompt_version: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    latency_ms: Optional[int] = None
    success: bool
    error_message: Optional[str] = None
    run_id: Optional[str] = None


class LLMLogListResponse(BaseModel):
    items: List[LLMLog]
    total: Optional[int] = None


# ----- Agent chat schemas -----


class AgentChatRequest(BaseModel):
    message: str
    conversation_history: List[ConversationMessage] = []
    session_id: Optional[str] = None


class AgentChatResponse(BaseModel):
    reply: str
    stops: List[StopBase] = []
    trip_found: bool = False
    trip_id: Optional[int] = None
    needs_confirmation: bool = False
    agent_steps: Optional[int] = None
    requires_auth: bool = False


class DemoChatRequest(BaseModel):
    message: str
    conversation_history: List[ConversationMessage] = []


# ----- RAG schemas -----


class HistoryQuestionRequest(BaseModel):
    question: str


class HistoryQuestionResponse(BaseModel):
    answer: str
    sources_used: int

# ----- Stats schemas -----

class StatsSummaryResponse(BaseModel):
    trips_today: int
    trips_this_week: int
    stops_today: int
    stops_this_week: int
    miles_today: float
    miles_this_week: float
    miles_all_time: float
    total_trips: int
    total_stops: int

class DailyStatResponse(BaseModel):
    date: str
    trips: int
    stops: int
    miles: float


