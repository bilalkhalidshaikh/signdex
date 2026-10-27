"""Async SQLAlchemy persistence (PostgreSQL in production, SQLite for zero-setup demos)."""
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Index, Integer, String, Text, inspect, text
from sqlalchemy.engine import Dialect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from .config import get_settings

settings = get_settings()


class UTCDateTime(TypeDecorator):
    """Always store UTC and always return timezone-aware UTC (SQLite drops tzinfo)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class Base(DeclarativeBase):
    pass


class SignalRow(Base):
    __tablename__ = "b2b_signals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    industry: Mapped[str] = mapped_column(String(64), nullable=False)
    locations_count: Mapped[int] = mapped_column(Integer, nullable=False)
    signal_type: Mapped[str] = mapped_column(String(48), nullable=False)
    signal_urgency: Mapped[str] = mapped_column(String(16), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    decision_maker: Mapped[dict] = mapped_column(JSON, nullable=False)
    ai_opportunity_score: Mapped[int] = mapped_column(Integer, nullable=False)
    achrocall_status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    revenue_estimate: Mapped[str] = mapped_column(String(64), nullable=False)
    detected_timestamp: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    signal_detail: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="simulated")
    achrocall_reference: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    call_log: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_channel: Mapped[str | None] = mapped_column(String(48), nullable=True)
    source_telemetry: Mapped[list | None] = mapped_column(JSON, nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    city: Mapped[str | None] = mapped_column(String(64), nullable=True)

    __table_args__ = (
        Index("ix_b2b_signals_detected", "detected_timestamp"),
        Index("ix_b2b_signals_filter", "signal_type", "industry", "signal_urgency"),
    )


engine = create_async_engine(settings.async_database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


def _add_missing_columns(sync_conn) -> None:
    """Tiny forward-only migration so an existing demo database keeps working after upgrades."""
    existing = {c["name"] for c in inspect(sync_conn).get_columns("b2b_signals")}
    for name, ddl in (
        ("call_log", "JSON"),
        ("source_channel", "VARCHAR(48)"),
        ("source_telemetry", "JSON"),
        ("state", "VARCHAR(2)"),
        ("city", "VARCHAR(64)"),
    ):
        if name not in existing:
            sync_conn.execute(text(f"ALTER TABLE b2b_signals ADD COLUMN {name} {ddl}"))


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
