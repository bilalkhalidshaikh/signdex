import type { B2BSignal, Industry, SignalType, SourceChannel } from "./types";
import { CALL_STATUS_LABELS, INDUSTRIES, SIGNAL_LABELS, SIGNAL_TYPES, SOURCE_LABELS } from "./types";

export type Range = "24h" | "7d" | "30d";

export const RANGES: { value: Range; label: string; ms: number; short: string }[] = [
  { value: "24h", label: "Last 24 hours", ms: 24 * 3600_000, short: "6h" },
  { value: "7d", label: "Last 7 days", ms: 7 * 86400_000, short: "42h" },
  { value: "30d", label: "Last 30 days", ms: 30 * 86400_000, short: "7.5d" },
];

const ts = (s: B2BSignal) => new Date(s.detectedTimestamp).getTime();

export function inRange(signals: B2BSignal[], range: Range, now: number): B2BSignal[] {
  const ms = RANGES.find((r) => r.value === range)!.ms;
  return signals.filter((s) => now - ts(s) <= ms);
}

/** Latest quarter of the range vs the quarter before it: an honest "trend" from the data we actually have. */
export function trendWindows(signals: B2BSignal[], range: Range, now: number) {
  const q = RANGES.find((r) => r.value === range)!.ms / 4;
  const latest = signals.filter((s) => now - ts(s) <= q);
  const prior = signals.filter((s) => now - ts(s) > q && now - ts(s) <= 2 * q);
  return { latest, prior, label: RANGES.find((r) => r.value === range)!.short };
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function pipelineArr(s: B2BSignal, perLocation: number) {
  return (s.locationsCount * perLocation * s.aiOpportunityScore) / 100;
}

// --- Source groups for the trend chart ---------------------------------
export type SourceGroup = "hiring" | "footprint" | "intent";
export const GROUP_OF: Record<SourceChannel, SourceGroup> = {
  LINKEDIN_RECRUITING: "hiring",
  INDEED_JOB_BOARD: "hiring",
  GOOGLE_MAPS_MULTI_BRANCH_SCAN: "footprint",
  CRUNCHBASE_EXPANSION_API: "footprint",
  APOLLO_INTENT_FEED: "intent",
};
export const GROUP_LABEL: Record<SourceGroup, string> = {
  hiring: "Job posts (LinkedIn, Indeed)",
  footprint: "Locations & growth (Google Maps, Crunchbase)",
  intent: "Buyer interest (Apollo)",
};
export const GROUP_COLOR: Record<SourceGroup, string> = {
  hiring: "#4F46E5",
  footprint: "#10B981",
  intent: "#A78BFA",
};

export interface Bucket {
  label: string;
  hiring: number;
  footprint: number;
  intent: number;
  total: number;
}

export function bucketSeries(signals: B2BSignal[], range: Range, now: number): Bucket[] {
  const unit = range === "24h" ? 2 * 3600_000 : 86400_000;
  const n = range === "24h" ? 12 : range === "7d" ? 7 : 30;
  const out: Bucket[] = [];
  for (let i = 0; i < n; i++) {
    const end = now - (n - 1 - i) * unit;
    const d = new Date(end);
    out.push({
      label: range === "24h" ? d.toLocaleTimeString("en-US", { hour: "numeric" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hiring: 0,
      footprint: 0,
      intent: 0,
      total: 0,
    });
  }
  for (const s of signals) {
    const age = now - ts(s);
    const idx = n - 1 - Math.floor(age / unit);
    if (idx < 0 || idx >= n) continue;
    const g = GROUP_OF[s.sourceChannel];
    out[idx][g] += 1;
    out[idx].total += 1;
  }
  return out;
}

export function typeDistribution(signals: B2BSignal[]): { type: SignalType; count: number }[] {
  return SIGNAL_TYPES.map((t) => ({ type: t, count: signals.filter((s) => s.signalType === t).length }));
}

export function readinessByIndustry(signals: B2BSignal[]): { industry: Industry; score: number; signals: number; ready: number }[] {
  return INDUSTRIES.map((industry) => {
    const list = signals.filter((s) => s.industry === industry);
    return {
      industry,
      score: Math.round(avg(list.map((s) => s.aiOpportunityScore)) * 10) / 10,
      signals: list.length,
      ready: list.filter((s) => s.aiOpportunityScore >= 80).length,
    };
  });
}

// --- Lead stage ----------------------------------------------------------
export type Stage = "New" | "Qualified" | "Calling" | "Demo booked" | "Follow up";

export function stageFor(s: B2BSignal): Stage {
  if (s.achroCallStatus === "CALL_COMPLETED") return s.callLog?.outcome === "Demo Booked" ? "Demo booked" : "Follow up";
  if (s.achroCallStatus === "DISPATCHED_TO_ACHROCALL") return "Calling";
  return s.aiOpportunityScore >= 80 ? "Qualified" : "New";
}

export const STAGE_STYLES: Record<Stage, string> = {
  New: "bg-slate-100 text-slate-600",
  Qualified: "bg-emerald-50 text-emerald-700",
  Calling: "bg-amber-50 text-amber-700",
  "Demo booked": "bg-indigo-50 text-indigo-700",
  "Follow up": "bg-sky-50 text-sky-700",
};

// --- CSV export -----------------------------------------------------------
export function signalsToCsv(signals: B2BSignal[]): string {
  const cols = [
    "Company", "Industry", "City", "State", "Found on", "Why it's a lead", "Priority", "Fit score", "Locations", "Est. revenue",
    "Contact", "Title", "Email", "Phone", "Call status", "Found at",
  ];
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const rows = signals.map((s) =>
    [
      s.companyName, s.industry, s.city ?? "", s.state ?? "", SOURCE_LABELS[s.sourceChannel], SIGNAL_LABELS[s.signalType],
      s.signalUrgency[0] + s.signalUrgency.slice(1).toLowerCase(), s.aiOpportunityScore, s.locationsCount, s.revenueEstimate,
      s.decisionMaker.name, s.decisionMaker.title, s.decisionMaker.email, s.contactPhone, CALL_STATUS_LABELS[s.achroCallStatus], s.detectedTimestamp,
    ]
      .map(esc)
      .join(","),
  );
  return [cols.join(","), ...rows].join("\n");
}
