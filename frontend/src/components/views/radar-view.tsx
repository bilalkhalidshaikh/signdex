"use client";

import { AlertTriangle, CalendarDays, Download, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { CapturedBarChart, ReadinessChart, SourceTrendChart, TypeDonut } from "@/components/charts";
import { HotLeadsTable } from "@/components/hot-leads-table";
import { MetricsBar } from "@/components/metrics-bar";
import { StatusBadge } from "@/components/page-header";
import { ActivityFeed, FollowUps, PipelineSummary, SetupCard, TopSources } from "@/components/right-rail";
import { FilterSelect, SignalFeed } from "@/components/signal-feed";
import { RANGES, signalsToCsv, type Range } from "@/lib/analytics";
import { toast } from "@/lib/toast";
import type { B2BSignal, Filters } from "@/lib/types";
import type { ViewProps } from "./types";

interface Props extends ViewProps {
  filters: Filters;
  onFilters: (f: Filters) => void;
  range: Range;
  onRange: (r: Range) => void;
  query: string;
  onQuery: (q: string) => void;
  rangeSignals: B2BSignal[]; // period only
  visible: B2BSignal[]; // period + filters + search
  now: number;
  simulating: boolean;
  onSimulate: () => void;
}

export function RadarView({
  feed,
  filters,
  onFilters,
  range,
  onRange,
  query,
  onQuery,
  rangeSignals,
  visible,
  now,
  simulating,
  onSimulate,
  onPitch,
  onViewLog,
  onTelemetry,
  onOpenPaywall,
  onTab,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const perLocation = feed.config?.arrPerLocation ?? feed.metrics?.arrPerLocation ?? 9600;

  // "/" focuses search, like the reference design
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && t && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function exportCsv() {
    if (visible.length === 0) {
      toast({ title: "Nothing to export", description: "No signals match the current search, period and filters.", variant: "info" });
      return;
    }
    const url = URL.createObjectURL(new Blob([signalsToCsv(visible)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `signal-radar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${visible.length} signals`, description: "CSV downloaded (sandbox data).", variant: "success" });
  }

  return (
    <>
      {/* Header bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block flex-1 lg:max-w-md">
          <span className="sr-only">Search signals</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search companies, contacts, sources…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[11px] text-slate-400">/</kbd>
        </label>
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <FilterSelect
            label="Time period"
            value={range}
            onChange={(v) => onRange(v as Range)}
            options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
            icon={<CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <button type="button" onClick={exportCsv} className="btn btn-ghost">
            <Download className="h-4 w-4" /> Export
          </button>
          <button type="button" onClick={onSimulate} disabled={simulating} className="btn btn-dark">
            {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Simulate Real-Time Signal Ingestion
          </button>
        </div>
      </div>

      {/* Title */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">B2B AI Lead Signal Radar</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Autonomous phone automation pipeline. Live signal ingestion, synced with{" "}
            <span className="font-medium text-slate-800">AchroCall (achrocall.com)</span>.
          </p>
        </div>
        <StatusBadge connection={feed.connection} />
      </header>

      {feed.error && feed.allSignals.length === 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
          <div>
            <p className="font-medium text-rose-900">Signal API unavailable</p>
            <p className="mt-0.5 text-rose-800/80">{feed.error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Main canvas */}
        <div className="flex min-w-0 flex-col gap-8">
          <MetricsBar signals={rangeSignals} range={range} now={now} perLocation={perLocation} loading={feed.loading} />
          <SourceTrendChart signals={rangeSignals} range={range} now={now} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CapturedBarChart signals={rangeSignals} range={range} now={now} />
            <TypeDonut signals={rangeSignals} />
          </div>
          <HotLeadsTable signals={visible} onUpdated={feed.applySignal} onPitch={onPitch} onViewLog={onViewLog} onTelemetry={onTelemetry} />
          <ReadinessChart signals={rangeSignals} />
          <SignalFeed
            signals={visible}
            loading={feed.loading}
            filters={filters}
            onFiltersChange={onFilters}
            freshIds={feed.freshIds}
            onUpdated={feed.applySignal}
            onPitch={onPitch}
            onViewLog={onViewLog}
            onTelemetry={onTelemetry}
          />
        </div>

        {/* Right rail */}
        <aside className="flex min-w-0 flex-col gap-6" aria-label="Pipeline status">
          <SetupCard config={feed.config} onOpen={onOpenPaywall} />
          <PipelineSummary signals={rangeSignals} perLocation={perLocation} config={feed.config} onTab={onTab} />
          <TopSources signals={rangeSignals} />
          <FollowUps signals={rangeSignals} now={now} onUpdated={feed.applySignal} />
          <ActivityFeed events={feed.events} now={now} />
        </aside>
      </div>

      <p className="pb-2 text-center text-xs text-slate-400">
        Sandbox ingestion feed: companies, contacts and source telemetry are simulated (reserved 555-01XX / .example ranges). Built by SignDex.
      </p>
    </>
  );
}
