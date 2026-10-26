"use client";

import { Activity, ArrowRight, ChevronRight, Loader2, PhoneCall, Send } from "lucide-react";
import { useMemo, useState } from "react";
import type { TermEvent, TermTag } from "@/hooks/use-signal-feed";
import { pipelineArr } from "@/lib/analytics";
import { dispatchToAchroCall } from "@/lib/api";
import { toast } from "@/lib/toast";
import { PROVIDER_NAMES, SOURCE_CHANNELS, type AppConfig, type B2BSignal } from "@/lib/types";
import { cn, formatCurrencyCompact, timeAgo } from "@/lib/utils";
import type { TabId } from "./app-shell";

// --- Setup / onboarding ---------------------------------------------------
export function SetupCard({ config, onOpen }: { config: AppConfig | null; onOpen: () => void }) {
  const checks = [
    true, // sandbox ingestion is running
    !!config?.achrocallWebhookConfigured,
    !!config?.callbackSecretRequired,
    config?.database === "postgresql",
    !!config?.vapiLiveConfigured,
  ];
  const done = checks.filter(Boolean).length;
  const pct = Math.round((done / checks.length) * 100);
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl bg-slate-900 p-5 text-left shadow-card transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
    >
      <span className="relative h-12 w-12 shrink-0" role="img" aria-label={`${pct}% of production setup complete`}>
        <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
          <circle cx="22" cy="22" r={r} fill="none" stroke="#818CF8" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">{pct}%</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">Finish setting up</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
          {done} of {checks.length} steps done. Connect AchroCall endpoints and live providers to leave sandbox.
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

// --- Pipeline summary --------------------------------------------------------
export function PipelineSummary({
  signals,
  perLocation,
  config,
  onTab,
}: {
  signals: B2BSignal[];
  perLocation: number;
  config: AppConfig | null;
  onTab: (t: TabId) => void;
}) {
  const seg = useMemo(() => {
    const sum = (f: (s: B2BSignal) => boolean) => signals.filter(f).reduce((n, s) => n + pipelineArr(s, perLocation), 0);
    const count = (f: (s: B2BSignal) => boolean) => signals.filter(f).length;
    return [
      { label: "Call completed", color: "bg-emerald-500", arr: sum((s) => s.achroCallStatus === "CALL_COMPLETED"), n: count((s) => s.achroCallStatus === "CALL_COMPLETED") },
      { label: "In progress", color: "bg-amber-400", arr: sum((s) => s.achroCallStatus === "DISPATCHED_TO_ACHROCALL"), n: count((s) => s.achroCallStatus === "DISPATCHED_TO_ACHROCALL") },
      { label: "Awaiting dispatch", color: "bg-slate-300", arr: sum((s) => s.achroCallStatus === "PENDING"), n: count((s) => s.achroCallStatus === "PENDING") },
    ];
  }, [signals, perLocation]);
  const total = seg.reduce((n, s) => n + s.arr, 0);
  const moving = seg[0].arr + seg[1].arr;

  return (
    <section className="panel p-6" aria-label="Pipeline summary">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Pipeline summary</h2>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          {config?.achrocallMode === "live" ? "Live" : "Sandbox"}
        </span>
      </div>
      <p className="mt-4 text-xs text-slate-500">Dispatched to AchroCall</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{formatCurrencyCompact(moving)}</p>
      <p className="mt-1 text-xs text-slate-500">of {formatCurrencyCompact(total)} estimated pipeline ARR</p>

      <div className="mt-4 flex h-2 gap-1 overflow-hidden rounded-full" role="img" aria-label="Pipeline ARR by dispatch stage">
        {seg.map((s) => (
          <span key={s.label} className={cn("h-full rounded-full", s.color)} style={{ width: total ? `${Math.max((s.arr / total) * 100, s.arr > 0 ? 3 : 0)}%` : "0%" }} />
        ))}
        {total === 0 && <span className="h-full w-full rounded-full bg-slate-100" />}
      </div>
      <ul className="mt-4 space-y-2.5">
        {seg.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", s.color)} aria-hidden />
            <span className="flex-1 text-slate-600">{s.label}</span>
            <span className="text-xs text-slate-400">{s.n}</span>
            <span className="w-14 text-right font-medium tabular-nums text-slate-900">{formatCurrencyCompact(s.arr)}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onTab("voice")} className="btn btn-ghost mt-5 w-full">
        <PhoneCall className="h-4 w-4" /> View voice core
      </button>
    </section>
  );
}

// --- Top sources -----------------------------------------------------------
export function TopSources({ signals }: { signals: B2BSignal[] }) {
  const rows = SOURCE_CHANNELS.map((c) => ({ c, n: signals.filter((s) => s.sourceChannel === c).length })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...rows.map((r) => r.n));
  const colors = ["bg-indigo-600", "bg-indigo-500", "bg-indigo-400", "bg-indigo-300", "bg-indigo-200"];
  return (
    <section className="panel p-6" aria-label="Top signal sources">
      <h2 className="text-sm font-semibold text-slate-900">Top signal sources</h2>
      <ul className="mt-4 space-y-4">
        {rows.map((r, i) => (
          <li key={r.c}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-slate-600">{PROVIDER_NAMES[r.c]}</span>
              <span className="font-semibold tabular-nums text-slate-900">{r.n}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={cn("h-full rounded-full", colors[i])} style={{ width: `${(r.n / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
        All sources run in sandbox ingestion. Live provider APIs are provisioned on client commitment.
      </p>
    </section>
  );
}

// --- Follow-ups ---------------------------------------------------------------
interface Item {
  key: string;
  title: string;
  sub: string;
  signal: B2BSignal;
  kind: "schedule" | "dispatch" | "watch";
}

export function FollowUps({ signals, now, onUpdated }: { signals: B2BSignal[]; now: number; onUpdated: (s: B2BSignal) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const s of signals) {
      const first = s.decisionMaker.name.split(" ")[0];
      if (s.achroCallStatus === "CALL_COMPLETED" && s.callLog?.outcome === "Demo Booked")
        out.push({ key: `sched:${s.id}`, title: `Send scheduling options to ${first}`, sub: `${s.companyName} · demo booked`, signal: s, kind: "schedule" });
      else if (s.achroCallStatus === "PENDING" && s.signalUrgency === "CRITICAL")
        out.push({ key: `disp:${s.id}`, title: `Dispatch ${s.companyName}`, sub: `Critical · AI fit ${s.aiOpportunityScore}`, signal: s, kind: "dispatch" });
      else if (s.achroCallStatus === "DISPATCHED_TO_ACHROCALL")
        out.push({ key: `watch:${s.id}`, title: `Call in progress: ${s.companyName}`, sub: `${s.decisionMaker.name} · started ${timeAgo(s.dispatchedAt ?? s.detectedTimestamp, now)}`, signal: s, kind: "watch" });
    }
    const rank = { dispatch: 0, schedule: 1, watch: 2 } as const;
    return out.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, 5);
  }, [signals, now]);

  const open = items.filter((i) => !checked.has(i.key)).length;

  async function dispatch(s: B2BSignal) {
    setBusy(s.id);
    try {
      const res = await dispatchToAchroCall(s.id);
      onUpdated(res.signal);
      toast({ title: res.mode === "live" ? "Dispatched to AchroCall" : "Dispatched to AchroCall (Sandbox Mode)", description: res.message, variant: "success" });
    } catch (e) {
      toast({ title: "Dispatch failed", description: e instanceof Error ? e.message : "Unknown error", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel p-6" aria-label="Follow-ups">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Follow-ups today</h2>
        {open > 0 && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{open} open</span>}
      </div>
      <ul className="mt-4 space-y-4">
        {items.length === 0 && <li className="text-sm text-slate-500">Nothing needs attention right now.</li>}
        {items.map((it) => {
          const done = checked.has(it.key);
          return (
            <li key={it.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={done}
                onChange={() =>
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (next.has(it.key)) next.delete(it.key);
                    else next.add(it.key);
                    return next;
                  })
                }
                aria-label={`Mark done: ${it.title}`}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium text-slate-800", done && "text-slate-400 line-through")}>{it.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{it.sub}</p>
              </div>
              {it.kind === "dispatch" && !done && (
                <button
                  type="button"
                  onClick={() => dispatch(it.signal)}
                  disabled={busy === it.signal.id}
                  aria-label={`Dispatch ${it.signal.companyName} to AchroCall`}
                  className="btn btn-ghost px-2.5 py-1.5"
                >
                  {busy === it.signal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              )}
              {it.kind === "schedule" && !done && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// --- Recent activity -------------------------------------------------------------
const DOT: Record<TermTag, string> = {
  SYS: "bg-slate-300",
  INGEST: "bg-sky-400",
  RADAR: "bg-amber-400",
  WEBHOOK: "bg-amber-400",
  ACHROCALL: "bg-emerald-500",
  VAPI: "bg-indigo-400",
};

export function ActivityFeed({ events, now }: { events: TermEvent[]; now: number }) {
  const recent = events.filter((e) => e.tag !== "SYS").slice(-6).reverse();
  return (
    <section className="panel p-6" aria-label="Recent activity">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Activity className="h-4 w-4 text-slate-400" aria-hidden /> Recent activity
      </h2>
      <ul className="mt-4 space-y-4" aria-live="polite">
        {recent.length === 0 && <li className="text-sm text-slate-500">Waiting for events…</li>}
        {recent.map((e) => (
          <li key={e.id} className="flex gap-3">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[e.tag])} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm leading-snug text-slate-600">{e.text.length > 120 ? `${e.text.slice(0, 117)}…` : e.text}</p>
              <p className="mt-0.5 text-xs text-slate-400">{timeAgo(new Date(e.ts).toISOString(), now)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
