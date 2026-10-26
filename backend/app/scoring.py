"""AI Opportunity Score: predicted ROI of deploying an AchroCall AI Receptionist."""
import random

from .models import Industry, SignalType, SignalUrgency

BASE_SCORE: dict[SignalType, int] = {
    SignalType.RECEPTIONIST_HIRING_SPIKE: 74,
    SignalType.SINGLE_PHONE_MULTI_BRANCH: 72,
    SignalType.NEW_LOCATION_OPENED: 70,
    SignalType.AUTOMATION_ADOPTION_INTENT: 64,
}

INDUSTRY_FIT: dict[Industry, int] = {
    Industry.HEALTHCARE_DENTAL: 6,
    Industry.LEGAL_INTAKE: 5,
    Industry.PROPERTY_MANAGEMENT: 4,
    Industry.AUTOMOTIVE: 3,
    Industry.COMMERCIAL_HVAC: 2,
}


def score_signal(
    signal_type: SignalType,
    industry: Industry,
    locations_count: int,
    rng: random.Random | None = None,
) -> int:
    """Deterministic base (signal strength + industry fit + call-volume proxy) with small jitter."""
    rng = rng or random
    score = (
        BASE_SCORE[signal_type]
        + INDUSTRY_FIT[industry]
        + min(locations_count, 8) * 1.5
        + rng.uniform(-4, 6)
    )
    return max(41, min(99, round(score)))


def urgency_for(score: int) -> SignalUrgency:
    if score >= 88:
        return SignalUrgency.CRITICAL
    if score >= 80:
        return SignalUrgency.HIGH
    return SignalUrgency.MEDIUM


def revenue_for(locations_count: int) -> str:
    if locations_count <= 2:
        return "$1M - $2.5M ARR"
    if locations_count <= 4:
        return "$2.5M - $5M ARR"
    if locations_count <= 6:
        return "$5M - $10M ARR"
    if locations_count <= 9:
        return "$10M - $25M ARR"
    return "$25M - $50M ARR"
