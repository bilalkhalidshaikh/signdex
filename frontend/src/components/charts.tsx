"use client";

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  GROUP_COLOR,
  GROUP_LABEL,
  bucketSeries,
  readinessByIndustry,
  typeDistribution,
  type Range,
  type SourceGroup,
} from "@/lib/analytics";
import { SIGNAL_LABELS, type B2BSignal } from "@/lib/types";

const GROUPS: SourceGroup[] = ["hiring", "footprint", "intent"];
const TYPE_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#A78BFA"];

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 12,
  color: "#0f172a",
  boxShadow: "0 8px 24px -8px rgba(15,23,42,0.18)",
};

const axisTick = { fill: "#94a3b8", fontSize: 11 };

interface Props {
  signals: B2BSignal[];
  range: Range;
  now: number;
}

export function SourceTrendChart({ signals, range, now }: Props) {
  const data = useMemo(() => bucketSeries(signals, range, now), [signals, range, now]);
  return (
    <section className="panel p-6" aria-label="Leads by source">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Leads by source</h2>
          <p className="mt-1 text-sm text-slate-500">{signals.length} leads from all sources in this period</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {GROUPS.map((g) => (
            <li key={g} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g] }} aria-hidden />
              {GROUP_LABEL[g]}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
            <defs>
              {GROUPS.map((g) => (
                <linearGradient key={g} id={`fill-${g}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GROUP_COLOR[g]} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={GROUP_COLOR[g]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }} />
            {GROUPS.map((g) => (
              <Area
                key={g}
                type="monotone"
                dataKey={g}
                name={GROUP_LABEL[g].split(" (")[0]}
                stroke={GROUP_COLOR[g]}
                strokeWidth={2}
                fill={`url(#fill-${g})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function CapturedBarChart({ signals, range, now }: Props) {
  const data = useMemo(() => bucketSeries(signals, range, now), [signals, range, now]);
  return (
    <section className="panel p-6" aria-label="Leads found">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">Leads found</h2>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{signals.length}</p>
      <div className="mt-3 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ left: -28, right: 0, top: 4, bottom: 0 }}>
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
            <Bar dataKey="total" name="Leads" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={i === data.length - 1 ? "#4F46E5" : "#e2e8f0"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function TypeDonut({ signals }: { signals: B2BSignal[] }) {
  const dist = typeDistribution(signals).map((d, i) => ({ name: SIGNAL_LABELS[d.type], value: d.count, color: TYPE_COLORS[i % TYPE_COLORS.length] }));
  return (
    <section className="panel p-6" aria-label="Why leads were flagged">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">Why leads were flagged</h2>
      <p className="mt-1 text-sm text-slate-500">{signals.length} leads, grouped by what flagged them</p>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie data={dist} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                {dist.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-2.5">
          {dist.map((d) => (
            <li key={d.name} className="flex items-center gap-2.5 text-sm text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <span className="font-medium tabular-nums text-slate-900">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ReadinessChart({ signals }: { signals: B2BSignal[] }) {
  const data = readinessByIndustry(signals).map((r) => ({ industry: r.industry, score: r.score, signals: r.signals, ready: r.ready }));
  return (
    <section className="panel p-6" aria-label="Call readiness by industry">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">Call readiness by industry</h2>
      <p className="mt-1 text-sm text-slate-500">Average fit score (0–100). Higher means a better match for AI calling.</p>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="industry" width={140} tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(99,102,241,0.06)" }}
              contentStyle={tooltipStyle}
              formatter={(value, _n, item) => [`${value} average · ${item.payload.ready} of ${item.payload.signals} leads are high-fit (80+)`, "Fit score"]}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} fill="#6366F1" barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
