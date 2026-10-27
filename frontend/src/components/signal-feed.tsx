"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, Inbox, LayoutGrid, List, Loader2, Plus, SearchX, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useNow } from "@/hooks/use-now";
import type { Connection } from "@/hooks/use-signal-feed";
import { INDUSTRIES, SIGNAL_LABELS, SIGNAL_TYPES, URGENCIES, type B2BSignal, type Filters } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LeadTable } from "./lead-table";
import { SignalCard } from "./signal-card";

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label={label}
        className="inline-flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-h-10 sm:min-w-[9rem]"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {icon}
          <Select.Value />
        </span>
        <Select.Icon>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-float"
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="relative flex min-h-11 cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
              >
                <Select.ItemIndicator className="absolute left-2.5">
                  <Check className="h-3.5 w-3.5 text-brand" />
                </Select.ItemIndicator>
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

const DEFAULT_FILTERS: Filters = { signalType: "ALL", industry: "ALL", urgency: "ALL" };
const PAGE_SIZE = 10;

type SortMode = "newest" | "score";
type ViewMode = "cards" | "table";

interface Props {
  signals: B2BSignal[]; // already filtered by period, search and dropdowns, newest first
  loading: boolean;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  freshIds: Set<string>;
  onUpdated: (s: B2BSignal) => void;
  onPitch: (s: B2BSignal) => void;
  onViewLog: (s: B2BSignal) => void;
  onTelemetry: (s: B2BSignal) => void;
  /** Active search text (trimmed). Drives the actionable empty state. */
  query: string;
  simulating: boolean;
  onSimulate: () => void;
  /** Changes whenever search, period or filters change, which sends the pagination back to page one. */
  resetKey: string;
  /** Shown as a compact status dot on phones (the full badge is desktop-only). */
  connection?: Connection;
  /** One line of context under the title (counts, pipeline). Hidden on phones. */
  summary?: ReactNode;
}

export function SignalFeed({
  signals,
  loading,
  filters,
  onFiltersChange,
  freshIds,
  onUpdated,
  onPitch,
  onViewLog,
  onTelemetry,
  query,
  simulating,
  onSimulate,
  resetKey,
  connection,
  summary,
}: Props) {
  const now = useNow();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("newest");
  // Desktop defaults to the dense table (about ten leads per screen). Phones always get cards: the table is hidden below `lg`.
  const [view, setView] = useState<ViewMode>("table");
  // Pagination state is keyed by resetKey, so a new search/period/filter starts at page one without an effect.
  const [page, setPage] = useState({ key: resetKey, size: PAGE_SIZE });
  const size = page.key === resetKey ? page.size : PAGE_SIZE;

  const ordered = useMemo(
    () => (sort === "score" ? [...signals].sort((a, b) => b.aiOpportunityScore - a.aiOpportunityScore) : signals),
    [signals, sort],
  );
  const shown = ordered.slice(0, size);
  const remaining = ordered.length - shown.length;

  const all = (label: string) => ({ value: "ALL", label });
  const activeFilters = [filters.signalType, filters.industry, filters.urgency].filter((v) => v !== "ALL").length;

  return (
    <section aria-label="Live lead feed" className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Live Lead Feed</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {connection && (
                <span
                  role="status"
                  aria-label={connection === "live" ? "Demo mode, AI calling ready" : "Connection issue"}
                  className={cn("h-2 w-2 shrink-0 rounded-full lg:hidden", connection === "live" ? "bg-emerald-500" : "bg-amber-500")}
                />
              )}
              <span className="truncate">
                {signals.length} {signals.length === 1 ? "lead" : "leads"}
                {summary && <span className="hidden sm:inline"> · {summary}</span>}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Cards / Table are two views of the same list (table is desktop-only). */}
            <div role="group" aria-label="Feed view" className="hidden items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm lg:flex">
              {(
                [
                  ["cards", "Cards", LayoutGrid],
                  ["table", "Table", List],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    view === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="feed-filters"
              className="btn btn-ghost sm:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters{activeFilters > 0 && <span className="rounded-full bg-indigo-50 px-1.5 text-xs font-semibold text-indigo-700">{activeFilters}</span>}
            </button>
          </div>
        </div>

        <div id="feed-filters" className={cn("grid-cols-1 gap-3 sm:flex sm:flex-wrap", filtersOpen ? "grid" : "hidden")}>
          <FilterSelect
            label="Lead trigger"
            value={filters.signalType}
            onChange={(v) => onFiltersChange({ ...filters, signalType: v as Filters["signalType"] })}
            options={[all("All triggers"), ...SIGNAL_TYPES.map((t) => ({ value: t, label: SIGNAL_LABELS[t] }))]}
          />
          <FilterSelect
            label="Industry"
            value={filters.industry}
            onChange={(v) => onFiltersChange({ ...filters, industry: v as Filters["industry"] })}
            options={[all("All industries"), ...INDUSTRIES.map((i) => ({ value: i, label: i }))]}
          />
          <FilterSelect
            label="Priority"
            value={filters.urgency}
            onChange={(v) => onFiltersChange({ ...filters, urgency: v as Filters["urgency"] })}
            options={[all("All priorities"), ...URGENCIES.map((u) => ({ value: u, label: u[0] + u.slice(1).toLowerCase() }))]}
          />
          <FilterSelect
            label="Sort order"
            value={sort}
            onChange={(v) => setSort(v as SortMode)}
            options={[
              { value: "newest", label: "Sort: Newest first" },
              { value: "score", label: "Sort: Best fit" },
            ]}
          />
        </div>
      </div>

      {loading && signals.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel h-80 animate-pulse bg-slate-100/60" />
          ))}
        </div>
      ) : signals.length === 0 && query ? (
        // Actionable empty state: a search with no results offers to create matching signals.
        <div role="status" className="panel flex flex-col items-center gap-4 px-5 py-12 text-center sm:py-16">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <SearchX className="h-6 w-6" aria-hidden />
          </span>
          <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            <span className="font-semibold text-slate-900">0 leads match your search.</span> Click &lsquo;+ Find Leads for Search&rsquo; to instantly
            generate target leads for <span className="font-semibold text-slate-900">&ldquo;{query}&rdquo;</span>.
          </p>
          <button type="button" onClick={onSimulate} disabled={simulating} className="btn btn-dark w-full sm:w-auto">
            {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Find Leads for Search
          </button>
        </div>
      ) : signals.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-5 py-16 text-center text-slate-500">
          <Inbox className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="text-sm">No leads match these filters.</p>
          {activeFilters > 0 && (
            <button type="button" onClick={() => onFiltersChange(DEFAULT_FILTERS)} className="btn btn-ghost">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={cn("grid grid-cols-1 gap-5 xl:grid-cols-2", view === "table" && "lg:hidden")}>
            {shown.map((s) => (
              <SignalCard
                key={s.id}
                signal={s}
                now={now}
                fresh={freshIds.has(s.id)}
                onUpdated={onUpdated}
                onPitch={onPitch}
                onViewLog={onViewLog}
                onTelemetry={onTelemetry}
              />
            ))}
          </div>
          {view === "table" && (
            <div className="hidden lg:block">
              <LeadTable signals={shown} onUpdated={onUpdated} onPitch={onPitch} onViewLog={onViewLog} onTelemetry={onTelemetry} />
            </div>
          )}

          {/* Pagination: 10 per page, never an endless scroll. */}
          {ordered.length > PAGE_SIZE && (
            <div className="flex flex-col items-center gap-3 pt-1">
              <p className="text-sm text-slate-500" aria-live="polite">
                Showing {shown.length} of {ordered.length}
              </p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {remaining > 0 && (
                  <button type="button" onClick={() => setPage({ key: resetKey, size: size + PAGE_SIZE })} className="btn btn-dark w-full sm:w-auto">
                    Load {Math.min(PAGE_SIZE, remaining)} more
                  </button>
                )}
                {size > PAGE_SIZE && (
                  <button type="button" onClick={() => setPage({ key: resetKey, size: PAGE_SIZE })} className="btn btn-ghost w-full sm:w-auto">
                    Show fewer
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
