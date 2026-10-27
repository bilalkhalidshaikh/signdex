"use client";

import { AlertTriangle, BarChart3, CalendarDays, Download, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnalyticsDrawer } from "@/components/analytics-drawer";
import { StatusBadge } from "@/components/page-header";
import { FilterSelect, SignalFeed } from "@/components/signal-feed";
import { RANGES, pipelineArr, signalsToCsv, type Range } from "@/lib/analytics";
import { describeParsed } from "@/lib/search";
import { toast } from "@/lib/toast";
import type { B2BSignal, Filters, ParsedQuery } from "@/lib/types";
import { formatCurrencyCompact } from "@/lib/utils";
import type { ViewProps } from "./types";

interface Props extends ViewProps {
  filters: Filters;
  onFilters: (f: Filters) => void;
  range: Range;
  onRange: (r: Range) => void;
  query: string;
  onQuery: (q: string) => void;
  parsed: ParsedQuery | null;
  rangeSignals: B2BSignal[]; // period only (feeds the analytics drawer)
  visible: B2BSignal[]; // period + filters + search (feeds the lead list)
  now: number;
  simulating: boolean;
  onSimulate: () => void;
}

/**
 * Live Radar = header bar, one slim title line, then the lead feed. Nothing else is in the page flow:
 * KPIs, charts and pipeline widgets live in the Reports drawer (closed by default).
 */
export function RadarView({
  feed,
  filters,
  onFilters,
  range,
  onRange,
  query,
  onQuery,
  parsed,
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
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const perLocation = feed.config?.arrPerLocation ?? feed.metrics?.arrPerLocation ?? 9600;
  const q = query.trim();
  const understood = describeParsed(parsed);

  // One quiet line of context under the feed title (text only, no cards).
  const summary = useMemo(() => {
    const highFit = rangeSignals.filter((s) => s.aiOpportunityScore >= 80).length;
    const inFlight = rangeSignals.filter((s) => s.achroCallStatus === "DISPATCHED_TO_ACHROCALL").length;
    const arr = rangeSignals.reduce((n, s) => n + pipelineArr(s, perLocation), 0);
    return `${highFit} high-fit · ${formatCurrencyCompact(arr)} est. value${inFlight ? ` · ${inFlight} in the call queue` : ""}`;
  }, [rangeSignals, perLocation]);

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
      toast({ title: "Nothing to export", description: "No leads match your current search and filters.", variant: "info" });
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
    toast({ title: `Exported ${visible.length} ${visible.length === 1 ? "lead" : "leads"}`, description: "Saved as a CSV file you can open in Excel (demo data).", variant: "success" });
  }

  const resetKey = `${range}|${q}|${filters.signalType}|${filters.industry}|${filters.urgency}`;

  return (
    <>
      {/* Header bar: search first, then period / reports / export / find leads. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1 lg:max-w-xl">
            <span className="sr-only">Search leads</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search, e.g. “Roofing in FL”"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-h-11 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {q ? (
              <button
                type="button"
                onClick={() => {
                  onQuery("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[11px] text-slate-400 sm:block">/</kbd>
            )}
          </label>

          <div className="grid grid-cols-[1fr_auto_auto] gap-3 sm:flex sm:flex-wrap sm:items-center lg:ml-auto">
            <FilterSelect
              label="Time period"
              value={range}
              onChange={(v) => onRange(v as Range)}
              options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
              icon={<CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />}
            />
            <button type="button" onClick={() => setAnalyticsOpen(true)} aria-label="Open reports" className="btn btn-ghost min-w-11 px-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </button>
            <button type="button" onClick={exportCsv} aria-label="Export leads to CSV" className="btn btn-ghost min-w-11 px-3">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export Leads</span>
            </button>
            <button type="button" onClick={onSimulate} disabled={simulating} className="btn btn-dark col-span-3 w-full sm:col-span-1 sm:w-auto">
              {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {q ? "Find Leads for Search" : "Find New Leads"}
            </button>
          </div>
        </div>

        {q && (
          <div className="flex flex-wrap items-center gap-2 text-xs" aria-live="polite">
            <span className="text-slate-500">
              {visible.length} {visible.length === 1 ? "lead" : "leads"} for
            </span>
            {understood.length > 0 ? (
              understood.map((p) => (
                <span key={p} className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                  {p}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">“{q}”</span>
            )}
          </div>
        )}
      </div>

      {/* One slim title line on desktop; phones rely on the sidebar brand (the feed must come first). */}
      <header className="hidden items-center justify-between gap-3 lg:flex">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Lead Radar
          <span className="ml-3 hidden text-sm font-normal text-slate-500 xl:inline">Find qualified B2B leads, then call them with AI</span>
        </h1>
        <StatusBadge connection={feed.connection} />
      </header>
      <h1 className="sr-only lg:hidden">Lead Radar</h1>

      {feed.error && feed.allSignals.length === 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
          <div>
            <p className="font-medium text-rose-900">Can&apos;t load leads</p>
            <p className="mt-0.5 text-rose-800/80">{feed.error}</p>
          </div>
        </div>
      )}

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
        query={q}
        simulating={simulating}
        onSimulate={onSimulate}
        resetKey={resetKey}
        connection={feed.connection}
        summary={summary}
      />

      <AnalyticsDrawer
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        feed={feed}
        rangeSignals={rangeSignals}
        range={range}
        now={now}
        perLocation={perLocation}
        onOpenPaywall={onOpenPaywall}
        onTab={onTab}
      />
    </>
  );
}
