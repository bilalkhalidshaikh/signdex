# SignDex: B2B AI Lead Signal Radar — Autonomous Phone Automation Pipeline

Live B2B buying-signal ingestion, synced with **AchroCall (achrocall.com)** for AI receptionist outreach.
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
| Source attribution | Every card shows `SOURCE: <channel>` (LinkedIn Recruiting, Indeed Job Board, Google Maps Multi-Branch Scan, Crunchbase Expansion API, Apollo Intent Feed), an intercept timestamp and matching telemetry. **Channels and telemetry are simulated** and cards are tagged `SANDBOX FEED`; no provider is actually queried. Pipeline Health shows each provider as sandbox-active with "Live API: awaiting client paid API key". |
| Production paywall notice | Banner under the top bar + sidebar card open an enterprise notice explaining sandbox vs. production (live scraping clusters, paid B2B providers, proxy/credit fees). It states no prices. |
| AchroCall dispatch | **Sandbox by default.** With `ACHROCALL_WEBHOOK_URL` empty the payload is built and recorded but *nothing is sent*; the UI toast says "sandbox mode". Set `ACHROCALL_WEBHOOK_URL` (+ `ACHROCALL_API_KEY`) to POST to AchroCall for real. The payload shape in `backend/app/achrocall.py` is **our guess** — align it with AchroCall's actual ingestion contract. |
| Call completion | In sandbox, a dispatched lead shows "AI call in progress…" and flips to `CALL_COMPLETED` after 20–25 s with a simulated voice log (outcome, summary, 9-turn transcript) viewable from the card. Pending sandbox calls are resumed if the backend restarts mid-call. In live mode, AchroCall should POST to `/api/achrocall/callback`. |
| "Live AI Pitch Demo" | **Scripted simulation** (tailored per lead), voiced with the browser's built-in speech synthesis (mute toggle in the modal; falls back to text-only if the browser has no voices). No Vapi call is placed. `VAPI_PUBLIC_KEY`/`VAPI_ASSISTANT_ID` are only reported as available; the real Vapi Web SDK is not wired in. |
| "Stream Health" badge | Reflects the real SSE connection (green when connected, amber while reconnecting). |
| Pipeline ARR metric | Score-weighted `locations × ACHROCALL_ARR_PER_LOCATION × score/100`. The $9,600/location default is a **placeholder assumption**, not AchroCall pricing. |
| "Today" metrics | Rolling last 24 h. On startup, simulated data older than `RESEED_IF_STALE_HOURS` (6) is rebuilt so the dashboard is never empty on demo day. |

## API

| Method & path | Purpose |
|---|---|
| `GET /api/b2b-signals?signalType=&industry=&urgency=` | Filtered feed |
| `POST /api/b2b-signals/simulate` | Generate, persist, and broadcast (SSE) a new signal |
| `GET /api/b2b-signals/stream` | Server-Sent Events: `signal.created`, `signal.updated` |
| `GET /api/b2b-signals/metrics` · `/analytics` | Executive bar + chart data |
| `GET /api/b2b-signals/{id}/export` | Apollo/Clay-shaped enriched profile |
| `POST /api/achrocall/dispatch` | Send lead to AchroCall (409 if already dispatched, 502 if AchroCall fails) |
| `POST /api/achrocall/callback` | Inbound call outcome → `CALL_COMPLETED` (optional `X-Achrocall-Secret`) |
| `POST /api/vapi/trigger-call` | Build the tailored pitch session for the voice modal |
| `GET /api/pipeline/health` | Per-channel sandbox status, 24 h signal counts, last-seen |
| `GET /api/config` | Read-only runtime config for System Settings (never returns secrets) |
| `GET /api/b2b-signals/{id}/achrocall-payload` | Preview of the exact dispatch body (nothing is sent) |

## Live Radar layout (light theme)

Three columns: left sidebar (sections, badge indicators, workspace widget), centre canvas, right rail.

- **Header bar:** search (press `/` to focus), time-period picker (24 h / 7 d / 30 d), `Export` (downloads the current view as CSV), and `Simulate Real-Time Signal Ingestion`.
- **KPI cards:** New signals, Avg intent score, High-fit B2B targets (score 80+), Est. pipeline ARR. The trend chips compare the latest quarter of the selected period with the quarter before it, computed from the feed, not invented percentages.
- **Charts:** Signals by source (area), Signals captured (bar), Signal type distribution, Conversion readiness by industry; all follow the period picker.
- **Hot leads table:** top leads by score (or newest) with source (click for the telemetry modal), stage (New / Qualified / Contacting / Demo booked / Follow-up) and quick actions.
- **Right rail:** "Finish setting up" (progress is real: webhook set, callback secret, PostgreSQL, live voice keys), Pipeline summary (score-weighted ARR split by dispatch stage), Top signal sources, Follow-ups (derived from real leads; checkboxes are local to the browser), Recent activity.
- Fonts: Inter if installed, otherwise the system sans-serif stack (no web-font download, so the build works offline).

## Dashboard tabs

`Live Radar` (feed, metrics, pipeline health, analytics) · `Campaign Swarms` (per-industry bulk dispatch) · `Webhook Routing` (AchroCall endpoint state + payload preview) · `CRM Sync` (Apollo/Clay payload export) · `Voice Core (AchroCall)` (call queue + voice logs) · `System Settings` (read-only config). A "Recent activity" card in the Live Radar side rail shows the latest ingestion/dispatch/call events from the SSE feed. The sandbox notice is a dismissible banner at the top (dismissal lasts the browser session; the sidebar's "Sandbox environment" entry reopens the full notice).

The legacy Express/Vite/Replit project was removed; a copy was saved outside the repo before deletion.
