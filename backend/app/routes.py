import asyncio
import logging
import random
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from . import repo
from .achrocall import AchroCallDispatchError, build_export_profile, build_lead_payload, send_to_achrocall
from .broadcaster import broadcaster, format_sse
from .config import get_settings
from .db import SessionLocal, get_session
from .generator import generate_signal
from .models import (
    AchroCallCallback,
    AchroCallStatus,
    AppConfig,
    Analytics,
    B2BSignal,
    CallLog,
    DispatchRequest,
    DispatchResponse,
    HealthResponse,
    Industry,
    Metrics,
    PipelineHealth,
    SignalType,
    SignalUrgency,
    SimulateRequest,
    VapiSession,
    VapiTriggerRequest,
)
from .vapi import build_pitch, build_sandbox_call_log

logger = logging.getLogger("radar.routes")
settings = get_settings()
router = APIRouter(prefix="/api")

_background: set[asyncio.Task] = set()


async def _load(session: AsyncSession, signal_id: UUID):
    row = await repo.get_row(session, str(signal_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Signal not found")
    return row


async def _publish(event: str, signal: B2BSignal) -> None:
    await broadcaster.publish(event, signal.model_dump(mode="json", by_alias=True))


SANDBOX_CALL_SECONDS = (20.0, 25.0)


async def _sandbox_complete_call(signal_id: str, delay: float) -> None:
    """Sandbox only: pretend AchroCall finished the outbound call, with a simulated voice log."""
    try:
        await asyncio.sleep(delay)
        async with SessionLocal() as session:
            row = await repo.get_row(session, signal_id)
            if row is None or row.achrocall_status != AchroCallStatus.DISPATCHED_TO_ACHROCALL.value:
                return
            log = build_sandbox_call_log(repo.to_model(row))
            row.call_log = log.model_dump(mode="json")
            row.achrocall_status = AchroCallStatus.CALL_COMPLETED.value
            await session.commit()
            await _publish("signal.updated", repo.to_model(row))
            logger.info("sandbox call completed: %s (%s)", row.company_name, log.outcome)
    except Exception:  # never let a background task die silently and strand a lead
        logger.exception("sandbox call completion failed for %s", signal_id)


def schedule_sandbox_completion(signal_id: str, delay: float | None = None) -> None:
    task = asyncio.create_task(_sandbox_complete_call(signal_id, delay if delay is not None else random.uniform(*SANDBOX_CALL_SECONDS)))
    _background.add(task)
    task.add_done_callback(_background.discard)


async def resume_sandbox_calls() -> None:
    """After a restart, finish any sandbox calls that were mid-flight so no lead is stranded."""
    if settings.achrocall_live or not settings.sandbox_auto_complete:
        return
    async with SessionLocal() as session:
        rows = await repo.list_dispatched_rows(session)
    now = datetime.now(timezone.utc)
    for row in rows:
        due = (row.dispatched_at or now).timestamp() + random.uniform(*SANDBOX_CALL_SECONDS)
        schedule_sandbox_completion(row.id, max(1.0, due - now.timestamp()))
    if rows:
        logger.info("resumed %d in-flight sandbox call(s)", len(rows))


# --- Health -----------------------------------------------------------------
@router.get("/health", response_model=HealthResponse)
async def health(session: AsyncSession = Depends(get_session)):
    return HealthResponse(
        status="ok",
        database="postgresql" if "postgresql" in settings.async_database_url else "sqlite",
        achrocall_mode="live" if settings.achrocall_live else "sandbox",
        stream_clients=broadcaster.client_count,
        signals_stored=await repo.count_signals(session),
    )


@router.get("/pipeline/health", response_model=PipelineHealth)
async def pipeline_health(session: AsyncSession = Depends(get_session)):
    return PipelineHealth(channels=await repo.compute_pipeline(session), stream_clients=broadcaster.client_count)


@router.get("/config", response_model=AppConfig)
async def app_config():
    """Read-only runtime configuration for the System Settings / Webhook Routing views. Never returns secrets."""
    return AppConfig(
        version="1.0.0",
        achrocall_mode="live" if settings.achrocall_live else "sandbox",
        achrocall_webhook_configured=settings.achrocall_live,
        callback_path="/api/achrocall/callback",
        callback_secret_required=bool(settings.achrocall_callback_secret),
        sandbox_auto_complete=settings.sandbox_auto_complete,
        sandbox_call_seconds=list(SANDBOX_CALL_SECONDS),
        database="postgresql" if "postgresql" in settings.async_database_url else "sqlite",
        arr_per_location=settings.achrocall_arr_per_location,
        reseed_if_stale_hours=settings.reseed_if_stale_hours,
        vapi_live_configured=settings.vapi_live_configured,
    )


# --- Signals ----------------------------------------------------------------
@router.get("/b2b-signals", response_model=list[B2BSignal])
async def list_signals(
    signal_type: SignalType | None = Query(None, alias="signalType"),
    industry: Industry | None = None,
    urgency: SignalUrgency | None = None,
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    return await repo.list_signals(
        session, signal_type=signal_type, industry=industry, urgency=urgency, limit=limit
    )


@router.get("/b2b-signals/metrics", response_model=Metrics)
async def metrics(session: AsyncSession = Depends(get_session)):
    return await repo.compute_metrics(session)


@router.get("/b2b-signals/analytics", response_model=Analytics)
async def analytics(session: AsyncSession = Depends(get_session)):
    return await repo.compute_analytics(session)


@router.get("/b2b-signals/stream")
async def stream(request: Request):
    queue = broadcaster.subscribe()

    async def events():
        try:
            yield "retry: 3000\n\n"
            yield format_sse("hello", {"serverTime": datetime.now(timezone.utc).isoformat()})
            while True:
                if await request.is_disconnected():
                    break
                try:
                    yield await asyncio.wait_for(queue.get(), timeout=10)
                except asyncio.TimeoutError:
                    yield format_sse("ping", {"serverTime": datetime.now(timezone.utc).isoformat()})
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )


@router.post("/b2b-signals/simulate", response_model=B2BSignal, status_code=201)
async def simulate(body: SimulateRequest | None = None, session: AsyncSession = Depends(get_session)):
    body = body or SimulateRequest()
    names = await repo.existing_company_names(session)
    signal = generate_signal(names, industry=body.industry, signal_type=body.signal_type)
    await repo.add_signals(session, [signal])
    await _publish("signal.created", signal)
    logger.info("simulated signal %s (%s, score %d)", signal.company_name, signal.signal_type.value, signal.ai_opportunity_score)
    return signal


@router.get("/b2b-signals/{signal_id}", response_model=B2BSignal)
async def get_signal(signal_id: UUID, session: AsyncSession = Depends(get_session)):
    return repo.to_model(await _load(session, signal_id))


@router.get("/b2b-signals/{signal_id}/achrocall-payload")
async def achrocall_payload_preview(signal_id: UUID, session: AsyncSession = Depends(get_session)):
    """The exact body a dispatch would POST to AchroCall (preview only; nothing is sent)."""
    return build_lead_payload(repo.to_model(await _load(session, signal_id)))


@router.get("/b2b-signals/{signal_id}/export")
async def export_signal(signal_id: UUID, session: AsyncSession = Depends(get_session)):
    return build_export_profile(repo.to_model(await _load(session, signal_id)))


# --- AchroCall --------------------------------------------------------------
@router.post("/achrocall/dispatch", response_model=DispatchResponse)
async def dispatch(body: DispatchRequest, session: AsyncSession = Depends(get_session)):
    row = await _load(session, body.signal_id)
    if row.achrocall_status != AchroCallStatus.PENDING.value:
        raise HTTPException(status_code=409, detail="Signal was already dispatched to AchroCall")

    signal = repo.to_model(row)
    try:
        mode, reference, payload = await send_to_achrocall(signal)
    except AchroCallDispatchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    row.achrocall_status = AchroCallStatus.DISPATCHED_TO_ACHROCALL.value
    row.achrocall_reference = reference
    row.dispatched_at = datetime.now(timezone.utc)
    await session.commit()

    updated = repo.to_model(row)
    await _publish("signal.updated", updated)

    if mode == "sandbox" and settings.sandbox_auto_complete:
        schedule_sandbox_completion(str(updated.id))

    message = (
        f"Lead sent to AchroCall ({reference})"
        if mode == "live"
        else f"{updated.company_name} queued for an outbound AI call (ref {reference})"
    )
    return DispatchResponse(mode=mode, reference=reference, message=message, payload=payload, signal=updated)


@router.post("/achrocall/callback", response_model=B2BSignal)
async def achrocall_callback(
    body: AchroCallCallback,
    x_achrocall_secret: str | None = Header(None),
    session: AsyncSession = Depends(get_session),
):
    """Inbound call-outcome webhook from AchroCall; marks the lead CALL_COMPLETED."""
    if settings.achrocall_callback_secret and x_achrocall_secret != settings.achrocall_callback_secret:
        raise HTTPException(status_code=401, detail="Invalid callback secret")
    row = await _load(session, body.signal_id)
    row.achrocall_status = AchroCallStatus.CALL_COMPLETED.value
    row.call_log = CallLog(
        outcome=body.outcome,
        summary=body.summary or f"Call {body.outcome} (reported by AchroCall).",
        duration_seconds=0,
        completed_at=datetime.now(timezone.utc),
    ).model_dump(mode="json")
    await session.commit()
    signal = repo.to_model(row)
    await _publish("signal.updated", signal)
    return signal


# --- Vapi demo --------------------------------------------------------------
@router.post("/vapi/trigger-call", response_model=VapiSession)
async def trigger_call(body: VapiTriggerRequest, session: AsyncSession = Depends(get_session)):
    signal = repo.to_model(await _load(session, body.signal_id))
    return build_pitch(signal)
