"""Pydantic v2 models for the B2B Operational Trigger Intelligence schema.

Fields are snake_case in Python and camelCase on the wire (matching the spec).
"""
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Industry(str, Enum):
    HEALTHCARE_DENTAL = "Healthcare & Dental"
    LEGAL_INTAKE = "Legal Intake"
    AUTOMOTIVE = "Automotive Services"
    PROPERTY_MANAGEMENT = "Property Management"
    COMMERCIAL_HVAC = "Commercial HVAC"


class SignalType(str, Enum):
    RECEPTIONIST_HIRING_SPIKE = "RECEPTIONIST_HIRING_SPIKE"
    NEW_LOCATION_OPENED = "NEW_LOCATION_OPENED"
    SINGLE_PHONE_MULTI_BRANCH = "SINGLE_PHONE_MULTI_BRANCH"
    AUTOMATION_ADOPTION_INTENT = "AUTOMATION_ADOPTION_INTENT"


class SignalUrgency(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"


class AchroCallStatus(str, Enum):
    PENDING = "PENDING"
    DISPATCHED_TO_ACHROCALL = "DISPATCHED_TO_ACHROCALL"
    CALL_COMPLETED = "CALL_COMPLETED"


class SourceChannel(str, Enum):
    LINKEDIN_RECRUITING = "LINKEDIN_RECRUITING"
    INDEED_JOB_BOARD = "INDEED_JOB_BOARD"
    GOOGLE_MAPS_MULTI_BRANCH_SCAN = "GOOGLE_MAPS_MULTI_BRANCH_SCAN"
    CRUNCHBASE_EXPANSION_API = "CRUNCHBASE_EXPANSION_API"
    APOLLO_INTENT_FEED = "APOLLO_INTENT_FEED"


class TelemetryItem(CamelModel):
    label: str
    value: str


class DecisionMaker(CamelModel):
    name: str
    title: str
    email: str


class CallLogTurn(CamelModel):
    speaker: str  # "agent" | "prospect"
    text: str


class CallLog(CamelModel):
    outcome: str
    summary: str
    duration_seconds: int
    transcript: list[CallLogTurn] = []
    completed_at: datetime


class B2BSignal(CamelModel):
    id: UUID
    company_name: str
    industry: Industry
    locations_count: int = Field(ge=1)
    signal_type: SignalType
    signal_urgency: SignalUrgency
    contact_phone: str
    decision_maker: DecisionMaker
    ai_opportunity_score: int = Field(ge=0, le=100)
    achrocall_status: AchroCallStatus = Field(alias="achroCallStatus")
    revenue_estimate: str
    detected_timestamp: datetime
    # Extras beyond the core schema
    signal_detail: str = ""
    source: str = "simulated"  # data mode: "simulated" (sandbox) or "live"
    source_channel: SourceChannel = SourceChannel.LINKEDIN_RECRUITING
    source_telemetry: list[TelemetryItem] = []
    achrocall_reference: str | None = Field(default=None, alias="achroCallReference")
    dispatched_at: datetime | None = None
    call_log: CallLog | None = None


# --- Requests ---------------------------------------------------------------
class SimulateRequest(CamelModel):
    industry: Industry | None = None
    signal_type: SignalType | None = None


class DispatchRequest(CamelModel):
    signal_id: UUID


class VapiTriggerRequest(CamelModel):
    signal_id: UUID


class AchroCallCallback(CamelModel):
    """Inbound call-outcome webhook from AchroCall."""

    signal_id: UUID
    outcome: str = "completed"
    summary: str | None = None


# --- Responses --------------------------------------------------------------
class DispatchResponse(CamelModel):
    mode: str  # "live" | "sandbox"
    reference: str
    message: str
    payload: dict[str, Any]
    signal: B2BSignal


class Metrics(CamelModel):
    total_signals_today: int
    high_urgency_targets: int
    dispatched_to_achrocall: int
    estimated_pipeline_arr: int
    arr_per_location: int
    window_hours: int = 24


class SignalTypeCount(CamelModel):
    signal_type: SignalType
    count: int


class IndustryReadiness(CamelModel):
    industry: Industry
    avg_score: float
    signals: int
    ready_count: int  # score >= 80


class Analytics(CamelModel):
    signal_type_distribution: list[SignalTypeCount]
    readiness_by_industry: list[IndustryReadiness]


class PitchTurn(CamelModel):
    speaker: str  # "agent" | "prospect"
    text: str
    pause_ms: int


class VapiSession(CamelModel):
    session_id: str
    mode: str  # "demo"
    company_name: str
    contact_name: str
    contact_title: str
    turns: list[PitchTurn]
    live_config_available: bool
    note: str


class PipelineChannel(CamelModel):
    channel: SourceChannel
    provider_mode: str  # "SANDBOX" | "LIVE"
    signals_24h: int = Field(alias="signals24h")  # to_camel would yield "signals24H"
    last_signal_at: datetime | None
    live_api: str  # "AWAITING_CLIENT_API_KEY" | "CONNECTED"


class PipelineHealth(CamelModel):
    channels: list[PipelineChannel]
    stream_clients: int


class AppConfig(CamelModel):
    version: str
    achrocall_mode: str
    achrocall_webhook_configured: bool
    callback_path: str
    callback_secret_required: bool
    sandbox_auto_complete: bool
    sandbox_call_seconds: list[float]
    database: str
    arr_per_location: int
    reseed_if_stale_hours: int
    vapi_live_configured: bool


class HealthResponse(CamelModel):
    status: str
    database: str
    achrocall_mode: str
    stream_clients: int
    signals_stored: int
