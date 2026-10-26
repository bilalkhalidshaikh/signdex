import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from . import repo
from .config import get_settings
from .db import SessionLocal, init_db
from .generator import generate_seed
from .routes import resume_sandbox_calls, router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")
logger = logging.getLogger("radar")
settings = get_settings()


async def ensure_demo_data() -> None:
    """Seed simulated signals; rebuild them when stale so 'today' metrics are never empty on demo day."""
    async with SessionLocal() as session:
        newest = await repo.newest_timestamp(session)
        stale = newest is not None and newest < datetime.now(timezone.utc) - timedelta(hours=settings.reseed_if_stale_hours)
        if newest is None or stale:
            if stale:
                logger.info("demo data is stale (newest %s) - rebuilding simulated signals", newest)
                await repo.clear_simulated(session)
            await repo.add_signals(session, generate_seed(settings.seed_count))
            logger.info("seeded %d simulated signals", settings.seed_count)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    await ensure_demo_data()
    await resume_sandbox_calls()
    logger.info("AchroCall mode: %s", "LIVE" if settings.achrocall_live else "SANDBOX (no data leaves this machine)")
    yield


app = FastAPI(
    title="B2B AI Lead Signal Radar API",
    description="Autonomous phone-automation lead pipeline synced with AchroCall (achrocall.com)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    if not request.url.path.endswith("/stream"):
        logger.info("%s %s -> %d (%.1f ms)", request.method, request.url.path, response.status_code, (time.perf_counter() - start) * 1000)
    return response


app.include_router(router)
