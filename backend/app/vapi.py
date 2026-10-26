"""Scripted outbound AI pitch used by the live-demo voice modal (simulated WebRTC session)."""
import random
import uuid
from datetime import datetime, timezone

from .config import get_settings
from .generator import INDUSTRY_PROFILE
from .models import B2BSignal, CallLog, CallLogTurn, PitchTurn, SignalType, VapiSession

settings = get_settings()

OBJECTIONS = {
    "patients": "Honestly, our patients expect a human voice. I'm wary of a robot answering for us.",
    "prospective clients": "Intake is sensitive. I'm not sure I'd trust an AI with someone's legal situation.",
    "customers": "We've tried phone menus before and customers hated them.",
    "residents": "Residents call about urgent maintenance. I can't have those calls dropped.",
    "service customers": "Dispatch calls are urgent. I can't have a bot fumbling an emergency call.",
}


def _opener(s: B2BSignal) -> str:
    c = s.company_name
    return {
        SignalType.RECEPTIONIST_HIRING_SPIKE: (
            f"I noticed {c} has several front-desk openings live right now. "
            "Instead of waiting weeks to hire and train, an AI receptionist can start answering every call today."
        ),
        SignalType.NEW_LOCATION_OPENED: (
            f"Congratulations on the new location. With {s.locations_count} sites now, "
            "call volume gets harder to cover. An AI receptionist scales to the new branch on day one."
        ),
        SignalType.SINGLE_PHONE_MULTI_BRANCH: (
            f"I see all {s.locations_count} of your branches share one front-desk number. "
            "That's a bottleneck: callers get busy signals while staff are with someone else."
        ),
        SignalType.AUTOMATION_ADOPTION_INTENT: (
            "It looks like your team has been evaluating automation tools recently. "
            "Phone handling is usually the highest-ROI place to start."
        ),
    }[s.signal_type]


def build_sandbox_call_log(s: B2BSignal) -> CallLog:
    """Simulated voice log for a finished sandbox call (same script family as the live pitch demo)."""
    turns = build_pitch(s).turns
    first = s.decision_maker.name.split()[0]
    booked = random.random() < 0.65
    outcome = "Demo Booked" if booked else "Follow-up Requested"
    result = (
        f"{first} agreed to a 15-minute walkthrough; scheduling options were emailed to {s.decision_maker.email}."
        if booked
        else f"{first} asked for details by email; a follow-up call is queued."
    )
    return CallLog(
        outcome=outcome,
        summary=f"Ava reached {s.decision_maker.name} ({s.decision_maker.title}) at {s.company_name} "
        f"and pitched an AI receptionist around: {s.signal_detail}. {result}",
        duration_seconds=random.randint(52, 118),
        transcript=[CallLogTurn(speaker=t.speaker, text=t.text) for t in turns],
        completed_at=datetime.now(timezone.utc),
    )


def build_pitch(s: B2BSignal) -> VapiSession:
    profile = INDUSTRY_PROFILE[s.industry]
    term = profile["caller_term"]
    first = s.decision_maker.name.split()[0]

    turns = [
        PitchTurn(
            speaker="agent",
            pause_ms=1200,
            text=(
                f"Hi, is this {first}, {s.decision_maker.title} at {s.company_name}? "
                "This is Ava, an AI voice assistant calling on behalf of AchroCall. I'll keep this to under a minute."
            ),
        ),
        PitchTurn(speaker="prospect", pause_ms=900, text="Yes, speaking. What's this about?"),
        PitchTurn(speaker="agent", pause_ms=1400, text=_opener(s)),
        PitchTurn(speaker="prospect", pause_ms=1000, text=OBJECTIONS[term]),
        PitchTurn(
            speaker="agent",
            pause_ms=1600,
            text=(
                f"That's fair. AchroCall answers in under a second, handles scheduling and FAQs for {term}, "
                f"and hands off to your team the moment a caller needs a person. For a business your size "
                f"({s.revenue_estimate.replace(' ARR', '')}), missed calls are usually the biggest hidden cost."
            ),
        ),
        PitchTurn(speaker="prospect", pause_ms=1000, text="Okay, that's interesting. What would setup look like?"),
        PitchTurn(
            speaker="agent",
            pause_ms=1400,
            text=(
                f"About a week from kickoff, with your current number and call routing kept as they are. "
                f"Could I book a 15-minute walkthrough tailored to {s.company_name} this week?"
            ),
        ),
        PitchTurn(speaker="prospect", pause_ms=900, text="Sure, send me a few times by email."),
        PitchTurn(
            speaker="agent",
            pause_ms=800,
            text=f"Perfect. I'll send options to {s.decision_maker.email}. Thanks for your time, {first}.",
        ),
    ]
    return VapiSession(
        session_id=f"demo_{uuid.uuid4().hex[:10]}",
        mode="demo",
        company_name=s.company_name,
        contact_name=s.decision_maker.name,
        contact_title=s.decision_maker.title,
        turns=turns,
        live_config_available=settings.vapi_live_configured,
        note="Simulated WebRTC session. No real call is placed and no audio is transmitted.",
    )
