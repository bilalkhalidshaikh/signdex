# SignDex: Lead Radar for AI Calling

Find qualified B2B leads and queue AI outbound calls, synced with **AchroCall (achrocall.com)**.
Replaces the legacy consumer-intent (plumbing/roofing) prototype.

| Layer | Stack |
|---|---|
| `frontend/` | Next.js (App Router), TypeScript, Tailwind, Radix UI, Lucide, Recharts |
| `backend/` | FastAPI, Pydantic v2, async SQLAlchemy, Uvicorn |
| Storage | PostgreSQL (`DATABASE_URL=postgresql+asyncpg://…`), SQLite by default for zero-setup demos |

## Run it

```powershell
# one time
cd backend;  python -m venv .venv;  .\.venv\Scripts\python.exe -m pip install -r requirements.txt;  cd ..
cd frontend; npm install; cd ..

# every time (opens two windows)
.\start-demo.ps1
```

- Dashboard: <http://localhost:3100> (3100, not 3000, to avoid clashing with other local apps). `npm run dev|build|start|lint|verify` also work from the repo root.
- API + interactive docs: <http://localhost:8000/docs>
- Optional PostgreSQL: `docker compose up -d`, then set `DATABASE_URL` in `backend/.env` (see `backend/.env.example`; schema in `backend/schema.sql`).

## Deploying

The project is two deployables: the **Next.js frontend** goes on Vercel; the **FastAPI backend cannot** (it keeps an SSE stream open, runs in-process call timers and writes a SQLite file, none of which survive serverless functions). Host the backend on any container/VM host (Render, Railway, Fly.io, a VPS) using `backend/Dockerfile`, with `DATABASE_URL` pointing at PostgreSQL.

**Checks before every deploy** (from the repo root): `npm run verify` runs ESLint, `tsc --noEmit` and `next build`.

**1. Backend** (any host, HTTPS required): set `CORS_ORIGINS=https://<your-vercel-domain>` (add `CORS_ORIGIN_REGEX` only if you need Vercel preview URLs), plus `DATABASE_URL` and, when ready for live dispatch, the `ACHROCALL_*` variables. Run a single worker.

**2. Vercel**: import the repo and set **Root Directory = `frontend`** (Framework: Next.js, detected from `frontend/vercel.json`). Under Environment Variables add `NEXT_PUBLIC_API_URL=https://<your-backend-host>` (no trailing slash) and redeploy: it is inlined at build time. If it is missing, the deployed app shows a red "Backend not configured" badge and says which variable to set; the localhost fallback only applies when the page itself is served from localhost.

Notes: Node 20.9+ is required (`engines`). TypeScript is pinned to 6.x because `typescript-eslint` does not support TS 7 yet. The `frontend/public` asset names are case-sensitive on Vercel (Linux): reference them with their exact on-disk case.

## What is real vs. simulated (read before the demo)

| Piece | Status |
|---|---|
| Signal feed | **Simulated.** `backend/app/generator.py` fabricates companies. Phones use the reserved `555-01XX` range and emails the `.example` TLD, so nothing can reach a real person. There are no live LinkedIn/Indeed scrapers yet. |
| Lead sources | Every lead shows where it was found (LinkedIn job posts, Indeed job posts, Google Maps listings, Crunchbase company news, Apollo buyer interest), when, and what matched, in the **How we found this lead** window. **Sources and details are simulated**; no provider is actually queried. |
| Demo-mode notice | A dismissible banner under the top bar and the sidebar's "What changes when live" entry open a plain-language comparison of demo vs. going live, explaining that live data and calls carry usage fees. It states no prices. |
| AI call queue | **Demo by default.** With `ACHROCALL_WEBHOOK_URL` empty the call request is built and recorded but *nothing is sent*; the UI toast says "demo mode". Set `ACHROCALL_WEBHOOK_URL` (+ `ACHROCALL_API_KEY`) to POST to AchroCall for real. The payload shape in `backend/app/achrocall.py` is **our guess**: align it with AchroCall's actual ingestion contract. |
| Call results | In demo mode, a queued lead shows "Call in progress…" and flips to called after 20–25 s with a simulated transcript (outcome, summary, 9-turn conversation) viewable from the lead. Pending demo calls are resumed if the backend restarts mid-call. In live mode, AchroCall should POST to `/api/achrocall/callback`. |
| Preview AI Call | **Scripted simulation** (tailored per lead), voiced with the browser's built-in speech synthesis (mute toggle in the window; falls back to text-only if the browser has no voices). No Vapi call is placed. `VAPI_PUBLIC_KEY`/`VAPI_ASSISTANT_ID` are only reported as available; the real Vapi Web SDK is not wired in. |
| Connection badge | Reflects the real live connection ("Demo mode · AI calling ready" when connected, "Reconnecting…" otherwise). |
| Est. pipeline value | Fit-weighted `locations × ACHROCALL_ARR_PER_LOCATION × fit/100`. The $9,600/location default is a **placeholder assumption**, not AchroCall pricing. |
| "Today" metrics | Rolling last 24 h. On startup, simulated data older than `RESEED_IF_STALE_HOURS` (6) is rebuilt so the dashboard is never empty on demo day. |

## API

| Method & path | Purpose |
|---|---|
| `GET /api/b2b-signals?signalType=&industry=&urgency=` | Filtered feed |
| `POST /api/b2b-signals/simulate` | Generate, persist and broadcast (SSE) `count` (1-5) signals. Body: `{ query?, industry?, state?, signalType?, count? }`. With a `query` such as "Roofing companies in FL" every generated lead matches it (industry, state, city, leftover words as company name); explicit fields override the query. Returns `{ signals, matched, note }` |
| `GET /api/b2b-signals/parse?q=` | How a free-text search is understood: `{ industry, state, stateName, city, signalType, keywords, recognized }`. The dashboard filter and the simulator share this parser (`backend/app/queryparse.py`) |
| `GET /api/b2b-signals/stream` | Server-Sent Events: `signal.created`, `signal.updated` |
| `GET /api/b2b-signals/metrics` · `/analytics` | Executive bar + chart data |
| `GET /api/b2b-signals/{id}/export` | Apollo/Clay-shaped enriched profile |
| `POST /api/achrocall/dispatch` | Send lead to AchroCall (409 if already dispatched, 502 if AchroCall fails) |
| `POST /api/achrocall/callback` | Inbound call outcome → `CALL_COMPLETED` (optional `X-Achrocall-Secret`) |
| `POST /api/vapi/trigger-call` | Build the tailored pitch session for the voice modal |
| `GET /api/pipeline/health` | Per-channel sandbox status, 24 h signal counts, last-seen |
| `GET /api/config` | Read-only runtime config for System Settings (never returns secrets) |
| `GET /api/b2b-signals/{id}/achrocall-payload` | Preview of the exact dispatch body (nothing is sent) |

## Search and simulate

The search box understands plain English: an industry (roofing, HVAC, dental, legal, auto, property, plumbing/electrical), a US state by name or code (`Florida`, `FL`; a lowercase code is accepted after "in"), a city, a signal type (hiring, new location, multi-branch, automation) and any leftover words (matched against company/contact text). Chips under the box show what was understood. Simulating while a search is active generates 3 leads that match it; with no search it generates 1 random lead. If a search has no matches the feed shows an empty state offering to generate them. Industries: Healthcare & Dental, Legal Intake, Automotive Services, Property Management, Commercial HVAC, Roofing & Exteriors, Plumbing & Electrical.

## Lead Radar layout (feed first)

Lead Radar is deliberately minimal: a header bar, one slim title line, then the lead feed. Nothing else is in the page flow, on any screen size.

- **Header bar:** search (press `/` to focus), time-period picker, **Reports** (opens the drawer), **Export Leads** (CSV of the current view) and **Find New Leads** (becomes **Find Leads for Search** while a search is active).
- **Live Lead Feed:** **10 leads per page** with a `Load 10 more` / `Show fewer` control ("Showing 10 of 109"); a new search, period or filter returns to page one. Sort by newest or best fit. Desktop defaults to a dense **Table** with a **Cards** toggle; phones always get compact cards. Each lead offers **Dispatch Call**, **Preview AI Call**, **How we found this lead** and **Export lead to your CRM**.
- **Reports drawer (closed by default):** New leads, Average fit score, High-fit leads, Est. pipeline value, Leads by source, Leads found, Why leads were flagged, Call readiness by industry, Get ready to go live, Pipeline summary, Top lead sources, Follow-ups today and Recent activity. It costs no page space until opened.
- Phone cards are compact and the page never scrolls horizontally (checked at 320, 360 and 390 px). Controls are at least 44 px tall.
- Fonts: Inter if installed, otherwise the system sans-serif stack (no web-font download, so the build works offline).
- The empty state reads "0 leads match your search. Click 'Find Leads for Search' to instantly generate target leads for <query>."

## Navigation

From 1024 px up, a persistent left sidebar lists every page (Lead Radar, Campaigns, Call Routing, CRM Export, AI Calling System, Settings). Below 1024 px the sidebar is replaced by a slim top bar with a hamburger that opens the same menu as a slide-out drawer: tap a link to navigate and close, or close with the X, an overlay tap or Esc; focus is trapped while open and returns to the hamburger, and page scroll is locked behind it.

## Pages

`Lead Radar` (feed and reports) · `Campaigns` (per-industry bulk calling) · `Call Routing` (calling-system connection and a call-details preview, with the raw payload behind "Show technical details") · `CRM Export` (Apollo/Clay-shaped export) · `AI Calling System` (Outbound Call Queue and call transcripts) · `Settings` (read-only workspace setup). "Recent activity" in the Reports drawer shows the latest lead and call events from the live feed. The demo-mode banner is dismissible (for the browser session) and the sidebar's "What changes when live" entry reopens the full comparison.

Copy note: the UI uses plain business wording. API field and enum names (`aiOpportunityScore`, `sourceChannel`, `CALL_COMPLETED`, `/api/b2b-signals/*`) are unchanged.

The legacy Express/Vite/Replit project was removed; a copy was saved outside the repo before deletion.
