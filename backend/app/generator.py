"""Synthetic B2B buying-signal generator (demo ingestion source).

Everything produced here is fictional: phone numbers use the reserved 555-01XX
range and emails use the reserved `.example` TLD, so a demo dispatch can never
reach a real person.
"""
import random
import re
import uuid
from datetime import datetime, timedelta, timezone

from .models import (
    AchroCallStatus,
    B2BSignal,
    DecisionMaker,
    Industry,
    SignalType,
    SignalUrgency,
    SourceChannel,
    TelemetryItem,
)
from .scoring import revenue_for, score_signal, urgency_for

PREFIXES = [
    "Apex", "Summit", "Vanguard", "Metro", "Cornerstone", "Evergreen", "Harbor", "Lakeside",
    "Pinnacle", "Redwood", "Northgate", "Brightway", "Keystone", "Meridian", "Sterling",
    "Beacon", "Ironwood", "Crestview", "Silverline", "Bluepeak", "Granite", "Riverbend",
    "Oakmont", "Westfield", "Trinity", "Horizon", "Atlas", "Liberty",
]

INDUSTRY_PROFILE: dict[Industry, dict] = {
    Industry.HEALTHCARE_DENTAL: {
        "suffixes": ["Dental Group", "Family Dentistry", "Orthodontics", "Dental Partners", "Smile Clinics"],
        "titles": ["Chief Operating Officer", "Practice Operations Director", "Regional Practice Manager"],
        "locations": (2, 9),
        "caller_term": "patients",
    },
    Industry.LEGAL_INTAKE: {
        "suffixes": ["Law Partners", "Legal Group", "Injury Law", "& Associates", "Law Offices"],
        "titles": ["Managing Partner", "Director of Client Intake", "Firm Administrator"],
        "locations": (1, 6),
        "caller_term": "prospective clients",
    },
    Industry.AUTOMOTIVE: {
        "suffixes": ["Auto Collision & Repair", "Auto Care", "Collision Centers", "Service Group", "Automotive"],
        "titles": ["Regional Operations Manager", "Owner & President", "Director of Service Operations"],
        "locations": (1, 7),
        "caller_term": "customers",
    },
    Industry.PROPERTY_MANAGEMENT: {
        "suffixes": ["Property Management", "Residential Partners", "Realty Management", "Asset Services"],
        "titles": ["VP of Property Operations", "Director of Resident Services", "Portfolio Manager"],
        "locations": (3, 12),
        "caller_term": "residents",
    },
    Industry.COMMERCIAL_HVAC: {
        "suffixes": ["Mechanical Services", "Climate Systems", "HVAC & Refrigeration", "Comfort Solutions"],
        "titles": ["Director of Dispatch Operations", "General Manager", "Operations Director"],
        "locations": (1, 6),
        "caller_term": "service customers",
    },
}

FIRST_NAMES = [
    "Maya", "Daniel", "Priya", "Marcus", "Elena", "James", "Aisha", "Thomas", "Sofia", "Andre",
    "Rachel", "Omar", "Natalie", "Victor", "Hannah", "Carlos", "Imani", "Gregory", "Leah", "Kevin",
]
LAST_NAMES = [
    "Reyes", "Okafor", "Brennan", "Nakamura", "Castillo", "Hartley", "Voss", "Patel", "Whitfield",
    "Delgado", "Lindqvist", "Abara", "Moretti", "Fischer", "Quinn", "Bergstrom", "Salazar", "Hughes",
]

AREA_CODES = ["212", "305", "312", "404", "415", "512", "617", "646", "702", "713", "737", "786", "917"]

DETAILS: dict[SignalType, list[str]] = {
    SignalType.RECEPTIONIST_HIRING_SPIKE: [
        "{n} front-desk / intake listings posted within the last {d} days",
        "Open requisitions for {n} receptionist roles across {loc} branches in the past {d} days",
    ],
    SignalType.NEW_LOCATION_OPENED: [
        "New branch opened {d} days ago - now {loc} locations with no dedicated front-desk line",
        "Grand opening detected {d} days ago; location count grew to {loc}",
    ],
    SignalType.SINGLE_PHONE_MULTI_BRANCH: [
        "{loc} branch addresses all route through one published front-desk number",
        "Website lists {loc} locations but a single shared phone line for appointments and intake",
    ],
    SignalType.AUTOMATION_ADOPTION_INTENT: [
        "Tech-stack change: CRM and chat-widget tooling added in the last {d} days",
        "Pricing-page visits and AI-tool evaluations detected from the company's domain ({d}-day window)",
    ],
}


STATES = ["TX", "FL", "NY", "CA", "IL", "GA", "MA", "NV", "AZ", "NC"]

CHANNELS_BY_SIGNAL: dict[SignalType, list[SourceChannel]] = {
    SignalType.RECEPTIONIST_HIRING_SPIKE: [SourceChannel.LINKEDIN_RECRUITING, SourceChannel.INDEED_JOB_BOARD],
    SignalType.NEW_LOCATION_OPENED: [SourceChannel.CRUNCHBASE_EXPANSION_API, SourceChannel.GOOGLE_MAPS_MULTI_BRANCH_SCAN],
    SignalType.SINGLE_PHONE_MULTI_BRANCH: [SourceChannel.GOOGLE_MAPS_MULTI_BRANCH_SCAN],
    SignalType.AUTOMATION_ADOPTION_INTENT: [SourceChannel.APOLLO_INTENT_FEED],
}


def default_channel(signal_type: SignalType) -> SourceChannel:
    return CHANNELS_BY_SIGNAL[signal_type][0]


def build_telemetry(channel: SourceChannel, locations: int, rng: random.Random) -> list[TelemetryItem]:
    """Matching evidence as the source channel would report it (sandbox values)."""
    confidence = f"{rng.randint(88, 99)}%"
    region = f"US-{rng.choice(STATES)}"
    items: list[tuple[str, str]]
    if channel == SourceChannel.LINKEDIN_RECRUITING:
        items = [
            ("Query", "front desk OR intake coordinator OR receptionist"),
            ("Postings matched", f"{rng.randint(2, 5)} in {rng.randint(2, 7)}d"),
            ("Match confidence", confidence),
            ("Scan region", region),
        ]
    elif channel == SourceChannel.INDEED_JOB_BOARD:
        items = [
            ("Query", "receptionist OR patient/client coordinator"),
            ("Active listings", str(rng.randint(2, 5))),
            ("Match confidence", confidence),
            ("Scan region", region),
        ]
    elif channel == SourceChannel.GOOGLE_MAPS_MULTI_BRANCH_SCAN:
        items = [
            ("Branches clustered", str(locations)),
            ("Shared phone lines", "1"),
            ("Match confidence", confidence),
            ("Geo cluster", region),
        ]
    elif channel == SourceChannel.CRUNCHBASE_EXPANSION_API:
        items = [
            ("Event", rng.choice(["New facility opened", "Expansion round announced", "Multi-site rollout"])),
            ("Locations after event", str(locations)),
            ("Match confidence", confidence),
            ("HQ region", region),
        ]
    else:
        items = [
            ("Intent topic", "AI receptionist / call automation"),
            ("Intent surge", f"+{rng.randint(35, 140)}% vs 30d baseline"),
            ("Match confidence", confidence),
            ("Account region", region),
        ]
    return [TelemetryItem(label=k, value=v) for k, v in items]


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def _phone(rng: random.Random) -> str:
    return f"+1 ({rng.choice(AREA_CODES)}) 555-01{rng.randint(0, 99):02d}"


def generate_signal(
    existing_names: set[str] | None = None,
    *,
    industry: Industry | None = None,
    signal_type: SignalType | None = None,
    channel: SourceChannel | None = None,
    detected_at: datetime | None = None,
    rng: random.Random | None = None,
) -> B2BSignal:
    rng = rng or random.Random()
    existing_names = existing_names or set()

    industry = industry or rng.choice(list(Industry))
    profile = INDUSTRY_PROFILE[industry]
    signal_type = signal_type or rng.choice(list(SignalType))

    company = ""
    for _ in range(25):
        company = f"{rng.choice(PREFIXES)} {rng.choice(profile['suffixes'])}"
        if company not in existing_names:
            break

    low, high = profile["locations"]
    if signal_type in (SignalType.NEW_LOCATION_OPENED, SignalType.SINGLE_PHONE_MULTI_BRANCH):
        low = max(low, 2)
    locations = rng.randint(low, high)

    channel = channel or rng.choice(CHANNELS_BY_SIGNAL[signal_type])
    first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
    domain = f"{_slug(company)}.example"
    score = score_signal(signal_type, industry, locations, rng)

    detail = rng.choice(DETAILS[signal_type]).format(
        n=rng.randint(2, 5), d=rng.randint(2, 7) if signal_type != SignalType.NEW_LOCATION_OPENED else rng.randint(3, 14), loc=locations
    )

    return B2BSignal(
        id=uuid.uuid4(),
        company_name=company,
        industry=industry,
        locations_count=locations,
        signal_type=signal_type,
        signal_urgency=urgency_for(score),
        contact_phone=_phone(rng),
        decision_maker=DecisionMaker(
            name=f"{first} {last}",
            title=rng.choice(profile["titles"]),
            email=f"{first.lower()}.{last.lower()}@{domain}",
        ),
        ai_opportunity_score=score,
        achrocall_status=AchroCallStatus.PENDING,
        revenue_estimate=revenue_for(locations),
        detected_timestamp=detected_at or datetime.now(timezone.utc),
        signal_detail=detail,
        source="simulated",
        source_channel=channel,
        source_telemetry=build_telemetry(channel, locations, rng),
    )


def generate_seed(count: int) -> list[B2BSignal]:
    """`count` signals spread over the past ~10 hours, covering every industry and signal type."""
    rng = random.Random()
    now = datetime.now(timezone.utc)
    names: set[str] = set()
    signals: list[B2BSignal] = []
    industries = list(Industry)
    types = list(SignalType)
    # Seed a deliberate urgency mix so a demo feed always shows all three pill colours.
    per_type: dict[SignalType, int] = {}
    urgency_pattern = [SignalUrgency.HIGH, SignalUrgency.CRITICAL, SignalUrgency.MEDIUM, SignalUrgency.HIGH, SignalUrgency.CRITICAL]
    for i in range(count):
        minutes_ago = int((i + rng.random()) * (600 / max(count, 1)))
        wanted = urgency_pattern[i % len(urgency_pattern)]
        stype = types[(i * 3 + 1) % len(types)]
        options = CHANNELS_BY_SIGNAL[stype]
        per_type[stype] = per_type.get(stype, -1) + 1
        for _ in range(60):
            s = generate_signal(
                names,
                industry=industries[i % len(industries)],
                signal_type=stype,
                channel=options[per_type[stype] % len(options)],  # rotate so every provider shows in the seed
                detected_at=now - timedelta(minutes=minutes_ago + 2),
                rng=rng,
            )
            if s.signal_urgency == wanted:
                break
        names.add(s.company_name)
        signals.append(s)
    return signals
