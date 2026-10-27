"""Persistence helpers + row <-> model mapping."""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .db import SignalRow
from .models import (
    AchroCallStatus,
    Analytics,
    B2BSignal,
    CallLog,
    DecisionMaker,
    Industry,
    IndustryReadiness,
    Metrics,
    PipelineChannel,
    SignalType,
    SignalTypeCount,
    SignalUrgency,
    SourceChannel,
    TelemetryItem,
)
from .generator import default_channel

settings = get_settings()


def to_row(s: B2BSignal) -> SignalRow:
    return SignalRow(
        id=str(s.id),
        company_name=s.company_name,
        industry=s.industry.value,
        locations_count=s.locations_count,
        signal_type=s.signal_type.value,
        signal_urgency=s.signal_urgency.value,
        contact_phone=s.contact_phone,
        decision_maker=s.decision_maker.model_dump(),
        ai_opportunity_score=s.ai_opportunity_score,
        achrocall_status=s.achrocall_status.value,
        revenue_estimate=s.revenue_estimate,
        detected_timestamp=s.detected_timestamp,
        signal_detail=s.signal_detail,
        source=s.source,
        achrocall_reference=s.achrocall_reference,
        dispatched_at=s.dispatched_at,
        call_log=s.call_log.model_dump(mode="json") if s.call_log else None,
        source_channel=s.source_channel.value,
        source_telemetry=[t.model_dump() for t in s.source_telemetry],
        state=s.state,
        city=s.city,
    )


def to_model(r: SignalRow) -> B2BSignal:
    return B2BSignal(
        id=r.id,
        company_name=r.company_name,
        industry=Industry(r.industry),
        locations_count=r.locations_count,
        signal_type=SignalType(r.signal_type),
        signal_urgency=SignalUrgency(r.signal_urgency),
        contact_phone=r.contact_phone,
        decision_maker=DecisionMaker(**r.decision_maker),
        ai_opportunity_score=r.ai_opportunity_score,
        achrocall_status=AchroCallStatus(r.achrocall_status),
        revenue_estimate=r.revenue_estimate,
        detected_timestamp=r.detected_timestamp,
        signal_detail=r.signal_detail,
        source=r.source,
        achrocall_reference=r.achrocall_reference,
        dispatched_at=r.dispatched_at,
        call_log=CallLog.model_validate(r.call_log) if r.call_log else None,
        # Rows created before channel attribution existed get a deterministic fallback.
        source_channel=SourceChannel(r.source_channel) if r.source_channel else default_channel(SignalType(r.signal_type)),
        source_telemetry=[TelemetryItem.model_validate(t) for t in (r.source_telemetry or [])],
        state=r.state,
        city=r.city,
    )


async def list_signals(
    session: AsyncSession,
    *,
    signal_type: SignalType | None = None,
    industry: Industry | None = None,
    urgency: SignalUrgency | None = None,
    limit: int = 100,
) -> list[B2BSignal]:
    stmt = select(SignalRow).order_by(SignalRow.detected_timestamp.desc()).limit(limit)
    if signal_type:
        stmt = stmt.where(SignalRow.signal_type == signal_type.value)
    if industry:
        stmt = stmt.where(SignalRow.industry == industry.value)
    if urgency:
        stmt = stmt.where(SignalRow.signal_urgency == urgency.value)
    rows = (await session.scalars(stmt)).all()
    return [to_model(r) for r in rows]


async def get_row(session: AsyncSession, signal_id: str) -> SignalRow | None:
    return await session.get(SignalRow, signal_id)


async def list_dispatched_rows(session: AsyncSession) -> list[SignalRow]:
    stmt = select(SignalRow).where(SignalRow.achrocall_status == AchroCallStatus.DISPATCHED_TO_ACHROCALL.value)
    return list((await session.scalars(stmt)).all())


async def add_signals(session: AsyncSession, signals: list[B2BSignal]) -> None:
    session.add_all([to_row(s) for s in signals])
    await session.commit()


async def count_signals(session: AsyncSession) -> int:
    return await session.scalar(select(func.count()).select_from(SignalRow)) or 0


async def existing_company_names(session: AsyncSession) -> set[str]:
    return set((await session.scalars(select(SignalRow.company_name))).all())


async def newest_timestamp(session: AsyncSession) -> datetime | None:
    return await session.scalar(select(func.max(SignalRow.detected_timestamp)))


async def clear_simulated(session: AsyncSession) -> None:
    await session.execute(delete(SignalRow).where(SignalRow.source == "simulated"))
    await session.commit()


async def compute_metrics(session: AsyncSession) -> Metrics:
    window = 24
    since = datetime.now(timezone.utc) - timedelta(hours=window)
    rows = (await session.scalars(select(SignalRow).where(SignalRow.detected_timestamp >= since))).all()
    per_loc = settings.achrocall_arr_per_location
    pipeline = sum(r.locations_count * per_loc * r.ai_opportunity_score / 100 for r in rows)
    return Metrics(
        total_signals_today=len(rows),
        high_urgency_targets=sum(r.signal_urgency in ("CRITICAL", "HIGH") for r in rows),
        dispatched_to_achrocall=sum(r.achrocall_status != "PENDING" for r in rows),
        estimated_pipeline_arr=round(pipeline),
        arr_per_location=per_loc,
        window_hours=window,
    )


async def compute_pipeline(session: AsyncSession) -> list[PipelineChannel]:
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    rows = (await session.scalars(select(SignalRow).where(SignalRow.detected_timestamp >= since))).all()
    count: Counter[str] = Counter()
    last: dict[str, datetime] = {}
    for r in rows:
        ch = r.source_channel or default_channel(SignalType(r.signal_type)).value
        count[ch] += 1
        if ch not in last or r.detected_timestamp > last[ch]:
            last[ch] = r.detected_timestamp
    return [
        PipelineChannel(
            channel=c,
            provider_mode="SANDBOX",
            signals_24h=count.get(c.value, 0),
            last_signal_at=last.get(c.value),
            live_api="AWAITING_CLIENT_API_KEY",
        )
        for c in SourceChannel
    ]


async def compute_analytics(session: AsyncSession) -> Analytics:
    rows = (await session.scalars(select(SignalRow))).all()
    by_type = Counter(r.signal_type for r in rows)
    scores: dict[str, list[int]] = defaultdict(list)
    for r in rows:
        scores[r.industry].append(r.ai_opportunity_score)
    return Analytics(
        signal_type_distribution=[
            SignalTypeCount(signal_type=t, count=by_type.get(t.value, 0)) for t in SignalType
        ],
        readiness_by_industry=[
            IndustryReadiness(
                industry=i,
                avg_score=round(sum(scores[i.value]) / len(scores[i.value]), 1) if scores[i.value] else 0,
                signals=len(scores[i.value]),
                ready_count=sum(s >= 80 for s in scores[i.value]),
            )
            for i in Industry
        ],
    )
