"""AchroCall (achrocall.com) lead dispatch.

LIVE mode  : ACHROCALL_WEBHOOK_URL is set -> the payload is POSTed to that webhook.
SANDBOX    : not set -> the payload is built and validated but nothing leaves this machine.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from .config import get_settings
from .models import B2BSignal

logger = logging.getLogger("radar.achrocall")
settings = get_settings()

SIGNAL_LABELS = {
    "RECEPTIONIST_HIRING_SPIKE": "Receptionist hiring spike",
    "NEW_LOCATION_OPENED": "New location opened",
    "SINGLE_PHONE_MULTI_BRANCH": "Single phone line across multiple branches",
    "AUTOMATION_ADOPTION_INTENT": "Automation adoption intent",
}


class AchroCallDispatchError(Exception):
    pass


def build_lead_payload(s: B2BSignal) -> dict[str, Any]:
    first, _, last = s.decision_maker.name.partition(" ")
    return {
        "source": "b2b-ai-lead-signal-radar",
        "sentAt": datetime.now(timezone.utc).isoformat(),
        "lead": {
            "externalId": str(s.id),
            "company": s.company_name,
            "industry": s.industry.value,
            "locations": s.locations_count,
            "revenueEstimate": s.revenue_estimate,
            "phone": s.contact_phone,
            "contact": {
                "firstName": first,
                "lastName": last,
                "fullName": s.decision_maker.name,
                "title": s.decision_maker.title,
                "email": s.decision_maker.email,
            },
        },
        "signal": {
            "type": s.signal_type.value,
            "label": SIGNAL_LABELS[s.signal_type.value],
            "urgency": s.signal_urgency.value,
            "detail": s.signal_detail,
            "detectedAt": s.detected_timestamp.isoformat(),
            "aiOpportunityScore": s.ai_opportunity_score,
            "sourceChannel": s.source_channel.value,
            "telemetry": {t.label: t.value for t in s.source_telemetry},
        },
        "call": {
            "type": "outbound_ai_receptionist_pitch",
            "priority": s.signal_urgency.value,
            "talkingPoints": [
                s.signal_detail,
                f"{s.locations_count} location(s) sharing front-desk call handling",
            ],
        },
    }


async def send_to_achrocall(s: B2BSignal) -> tuple[str, str, dict[str, Any]]:
    """Returns (mode, reference, payload). Raises AchroCallDispatchError on live failure."""
    payload = build_lead_payload(s)

    if not settings.achrocall_live:
        reference = f"sbx_{uuid.uuid4().hex[:12]}"
        logger.info("sandbox dispatch %s -> %s", s.company_name, reference)
        return "sandbox", reference, payload

    headers = {"Content-Type": "application/json", "User-Agent": "signal-radar/1.0"}
    if settings.achrocall_api_key:
        headers["Authorization"] = f"Bearer {settings.achrocall_api_key}"
    try:
        async with httpx.AsyncClient(timeout=settings.achrocall_timeout_seconds) as client:
            resp = await client.post(settings.achrocall_webhook_url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.error("AchroCall dispatch failed: %s", exc)
        raise AchroCallDispatchError("Couldn't reach the AI calling system. Please try again in a moment.") from exc

    if resp.status_code >= 300:
        logger.error("AchroCall rejected lead %s: HTTP %s", s.id, resp.status_code)
        raise AchroCallDispatchError(f"The AI calling system declined this lead (error {resp.status_code}).")

    reference = f"ac_{uuid.uuid4().hex[:12]}"
    try:
        body = resp.json()
        if isinstance(body, dict):
            reference = str(body.get("id") or body.get("leadId") or body.get("reference") or reference)
    except ValueError:
        pass
    logger.info("live dispatch %s -> %s", s.company_name, reference)
    return "live", reference, payload


def build_export_profile(s: B2BSignal) -> dict[str, Any]:
    """Enriched company profile shaped for Apollo / Clay import."""
    first, _, last = s.decision_maker.name.partition(" ")
    return {
        "organization": {
            "name": s.company_name,
            "industry": s.industry.value,
            "estimated_annual_revenue": s.revenue_estimate,
            "num_locations": s.locations_count,
            "phone": s.contact_phone,
        },
        "person": {
            "first_name": first,
            "last_name": last,
            "title": s.decision_maker.title,
            "email": s.decision_maker.email,
        },
        "intent": {
            "signal_type": s.signal_type.value,
            "signal_detail": s.signal_detail,
            "urgency": s.signal_urgency.value,
            "ai_opportunity_score": s.ai_opportunity_score,
            "detected_at": s.detected_timestamp.isoformat(),
            "source_channel": s.source_channel.value,
            "source_telemetry": {t.label: t.value for t in s.source_telemetry},
        },
        "achrocall": {
            "status": s.achrocall_status.value,
            "reference": s.achrocall_reference,
        },
        "meta": {"signal_id": str(s.id), "source": s.source},
    }
