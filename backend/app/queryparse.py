"""Turns a free-text search ("Roofing companies in FL", "HVAC in Texas") into structured filters.

This is the single source of truth: the dashboard filters the feed with it AND the simulator generates
signals from it, so what you search for is exactly what gets created.
"""
import re

from .geo import STATE_BY_NAME, US_STATES
from .models import Industry, ParsedQuery, SignalType

# Two-letter words that are also common English words: only accepted as a state when typed in UPPERCASE.
AMBIGUOUS_ABBR = {"in", "or", "me", "hi", "ok", "oh", "as", "us", "al", "ma", "pa", "de", "co", "id", "la", "wa", "it", "so", "no", "go", "to"}

INDUSTRY_PATTERNS: list[tuple[Industry, re.Pattern[str]]] = [
    (Industry.ROOFING, re.compile(r"\b(roof\w*|shingles?|gutters?|siding|exteriors?)\b")),
    (Industry.PLUMBING_ELECTRICAL, re.compile(r"\b(plumb\w*|electric\w*|drain\w*|rooter)\b")),
    (Industry.COMMERCIAL_HVAC, re.compile(r"\b(hvac|heating|cooling|air conditioning|furnaces?|refrigeration|ac|a/c)\b")),
    (Industry.HEALTHCARE_DENTAL, re.compile(r"\b(dent\w*|orthodont\w*|healthcare|health care|medical|clinics?|doctors?|physicians?|smile)\b")),
    (Industry.LEGAL_INTAKE, re.compile(r"\b(law|laws|lawyers?|attorneys?|legal|law firms?|injury)\b")),
    (Industry.AUTOMOTIVE, re.compile(r"\b(auto\w*|cars?|collision|mechanics?|body shops?|garage|tires?)\b")),
    (Industry.PROPERTY_MANAGEMENT, re.compile(r"\b(property|properties|real estate|realty|apartments?|landlords?|rentals?|residential)\b")),
    # (descriptor words such as "management", "intake", "repair" are in STOPWORDS above)
]

SIGNAL_PATTERNS: list[tuple[SignalType, re.Pattern[str]]] = [
    (SignalType.RECEPTIONIST_HIRING_SPIKE, re.compile(r"\b(hiring|hire|receptionists?|front desk|intake coordinators?)\b")),
    (SignalType.NEW_LOCATION_OPENED, re.compile(r"\b(new locations?|opened|opening|expansion|expanding|expand)\b")),
    (SignalType.SINGLE_PHONE_MULTI_BRANCH, re.compile(r"\b(multi-?branch|branches|single phone|shared phone|one phone)\b")),
    (SignalType.AUTOMATION_ADOPTION_INTENT, re.compile(r"\b(automation|automate|crm|adopt\w*)\b")),
]

STOPWORDS = {
    "a", "an", "the", "in", "near", "around", "for", "of", "and", "or", "with", "at", "on", "to", "from", "by",
    "company", "companies", "business", "businesses", "firm", "firms", "service", "services", "contractor", "contractors",
    "target", "targets", "lead", "leads", "signal", "signals", "find", "show", "me", "get", "generate", "all", "any",
    "top", "best", "local", "us", "usa", "united", "states",
    # generic business words that describe every lead, so they must never act as a filter or a name
    "office", "offices", "group", "groups", "partners", "associates", "practice", "practices", "shop", "shops",
    "management", "intake", "repair", "repairs", "owner", "owners", "team", "teams",
}

# lowercase city -> [(state, city)] (a few names repeat across states, e.g. Portland, Springfield)
CITY_INDEX: dict[str, list[tuple[str, str]]] = {}
for _abbr, (_name, _cities, _ac) in US_STATES.items():
    for _c in _cities:
        CITY_INDEX.setdefault(_c.lower(), []).append((_abbr, _c))
_CITY_NAMES = sorted(CITY_INDEX, key=len, reverse=True)

_WORD = re.compile(r"[A-Za-z0-9][A-Za-z0-9.&'/-]*")
_STATE_NAMES = sorted(STATE_BY_NAME, key=len, reverse=True)  # "west virginia" before "virginia"


def parse_query(raw: str | None) -> ParsedQuery:
    query = (raw or "").strip()
    if not query:
        return ParsedQuery(query="")

    lower = query.lower()
    consumed: list[tuple[int, int]] = []

    # --- State: full name first, then abbreviation ---------------------------------
    state: str | None = None
    for name in _STATE_NAMES:
        m = re.search(rf"\b{re.escape(name)}\b", lower)
        if m:
            state = STATE_BY_NAME[name]
            consumed.append(m.span())
            break
    if state is None:
        tokens = list(_WORD.finditer(query))
        candidates: list[tuple[str, tuple[int, int], bool]] = []  # (abbr, span, ambiguous)
        for i, m in enumerate(tokens):
            tok = m.group(0).strip(".,")
            if len(tok) != 2 or tok.upper() not in US_STATES or tok.lower() == "us":
                continue
            prev = tokens[i - 1].group(0).lower() if i > 0 else ""
            ambiguous = tok.lower() in AMBIGUOUS_ABBR
            # Uppercase is explicit ("FL", "TX"); lowercase is accepted right after a preposition ("in oh").
            if tok.isupper() or prev in {"in", "near", "around", "from"}:
                candidates.append((tok.upper(), m.span(), ambiguous))
        # "ROOFING IN FL": prefer FL over the preposition-looking IN.
        candidates.sort(key=lambda c: c[2])
        if candidates:
            state = candidates[0][0]
            consumed.append(candidates[0][1])

    # --- City: a known city also implies (or must agree with) the state -------------------
    city: str | None = None
    for name in _CITY_NAMES:
        m = re.search(rf"\b{re.escape(name)}\b", lower)
        if not m:
            continue
        options = CITY_INDEX[name]
        if state is None:
            state, city = options[0]
        else:
            same_state = [o for o in options if o[0] == state]
            if not same_state:
                continue  # e.g. "Portland" typed with a state that has no Portland in our data
            city = same_state[0][1]
        consumed.append(m.span())
        break

    # --- Industry: most keyword hits wins -------------------------------------------
    industry: Industry | None = None
    best = 0
    for ind, pattern in INDUSTRY_PATTERNS:
        hits = list(pattern.finditer(lower))
        if len(hits) > best:
            best, industry = len(hits), ind
            hit_spans = [h.span() for h in hits]
    if industry is not None:
        consumed.extend(hit_spans)
    else:  # an exact industry name typed in full, e.g. "Legal Intake"
        for ind in Industry:
            m = re.search(rf"\b{re.escape(ind.value.lower())}\b", lower)
            if m:
                industry = ind
                consumed.append(m.span())
                break

    # --- Signal type ---------------------------------------------------------------------
    signal_type: SignalType | None = None
    for st, pattern in SIGNAL_PATTERNS:
        m = pattern.search(lower)
        if m:
            signal_type = st
            consumed.append(m.span())
            break

    # --- Leftover words (a company name, a contact name, ...) ------------------------------
    keep = [True] * len(query)
    for a, b in consumed:
        for i in range(a, b):
            keep[i] = False
    leftover = "".join(c if k else " " for c, k in zip(query, keep))
    keywords = [w.strip(".,&'/-").lower() for w in _WORD.findall(leftover)]
    keywords = [w for w in keywords if len(w) >= 2 and w not in STOPWORDS]

    return ParsedQuery(
        query=query,
        industry=industry,
        state=state,
        state_name=US_STATES[state][0] if state else None,
        city=city,
        signal_type=signal_type,
        keywords=keywords,
        recognized=bool(industry or state or signal_type),
    )
