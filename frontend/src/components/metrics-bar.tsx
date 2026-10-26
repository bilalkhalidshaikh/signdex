import { Gauge, Radar, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { avg, pipelineArr, trendWindows, type Range } from "@/lib/analytics";
import type { B2BSignal } from "@/lib/types";
import { cn, formatCurrencyCompact } from "@/lib/utils";

interface Trend {
  text: string;
  tone: "up" | "down" | "flat";
}

interface Tile {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
  trend?: Trend;
  caption: string;
}

function delta(n: number, unit = ""): Trend {
  if (n === 0) return { text: `0${unit}`, tone: "flat" };
  return { text: `${n > 0 ? "+" : "−"}${Math.abs(n)}${unit}`, tone: n > 0 ? "up" : "down" };
}

const TREND_STYLES: Record<Trend["tone"], string> = {
  up: "bg-emerald-50 text-emerald-700",
  down: "bg-rose-50 text-rose-700",
  flat: "bg-slate-100 text-slate-600",
};

interface Props {
  signals: B2BSignal[]; // already limited to the selected range
  range: Range;
  now: number;
  perLocation: number;
  loading: boolean;
}

export function MetricsBar({ signals, range, now, perLocation, loading }: Props) {
  const { latest, prior, label } = trendWindows(signals, range, now);
  const vs = `vs prior ${label}`;

  const scoreNow = avg(latest.map((s) => s.aiOpportunityScore));
  const scorePrior = avg(prior.map((s) => s.aiOpportunityScore));
  const scoreDelta = latest.length && prior.length ? Math.round((scoreNow - scorePrior) * 10) / 10 : null;

  const highFit = signals.filter((s) => s.aiOpportunityScore >= 80);
  const highNow = latest.filter((s) => s.aiOpportunityScore >= 80).length;
  const highPrior = prior.filter((s) => s.aiOpportunityScore >= 80).length;

  const arr = signals.reduce((n, s) => n + pipelineArr(s, perLocation), 0);

  const dash = loading && signals.length === 0;
  const tiles: Tile[] = [
    {
      label: "New signals",
      value: dash ? "—" : String(signals.length),
      icon: Radar,
      tone: "bg-indigo-50 text-indigo-600",
      trend: delta(latest.length - prior.length),
      caption: vs,
    },
    {
      label: "Avg intent score",
      value: dash ? "—" : signals.length ? avg(signals.map((s) => s.aiOpportunityScore)).toFixed(1) : "—",
      icon: Gauge,
      tone: "bg-violet-50 text-violet-600",
      trend: scoreDelta === null ? undefined : delta(scoreDelta, " pts"),
      caption: scoreDelta === null ? "AI opportunity score" : vs,
    },
    {
      label: "High-fit B2B targets",
      value: dash ? "—" : String(highFit.length),
      icon: Target,
      tone: "bg-emerald-50 text-emerald-600",
      trend: delta(highNow - highPrior),
      caption: `score 80+ · ${vs}`,
    },
    {
      label: "Est. pipeline ARR",
      value: dash ? "—" : formatCurrencyCompact(arr),
      icon: TrendingUp,
      tone: "bg-amber-50 text-amber-600",
      caption: `score-weighted · ${formatCurrencyCompact(perLocation)}/location assumed`,
    },
  ];

  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4">
      {tiles.map(({ label, value, icon: Icon, tone, trend, caption }) => (
        <div key={label} className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone)}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
            {trend && <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", TREND_STYLES[trend.tone])}>{trend.text}</span>}
          </div>
          <p className="mt-2 truncate text-xs text-slate-500" title={caption}>
            {caption}
          </p>
        </div>
      ))}
    </section>
  );
}
