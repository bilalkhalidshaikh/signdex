"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, Inbox } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { INDUSTRIES, SIGNAL_LABELS, SIGNAL_TYPES, URGENCIES, type B2BSignal, type Filters } from "@/lib/types";
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
        className="inline-flex min-w-[10rem] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span className="flex items-center gap-2">
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
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-float"
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
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

interface Props {
  signals: B2BSignal[];
  loading: boolean;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  freshIds: Set<string>;
  onUpdated: (s: B2BSignal) => void;
  onPitch: (s: B2BSignal) => void;
  onViewLog: (s: B2BSignal) => void;
  onTelemetry: (s: B2BSignal) => void;
}

export function SignalFeed({ signals, loading, filters, onFiltersChange, freshIds, onUpdated, onPitch, onViewLog, onTelemetry }: Props) {
  const now = useNow();
  const all = (label: string) => ({ value: "ALL", label });

  return (
    <section aria-label="Live ingestion feed" className="space-y-6">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Live ingestion feed</h2>
          <p className="mt-1 text-sm text-slate-500">{signals.length} signals, newest first</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Signal type"
            value={filters.signalType}
            onChange={(v) => onFiltersChange({ ...filters, signalType: v as Filters["signalType"] })}
            options={[all("All signal types"), ...SIGNAL_TYPES.map((t) => ({ value: t, label: SIGNAL_LABELS[t] }))]}
          />
          <FilterSelect
            label="Industry"
            value={filters.industry}
            onChange={(v) => onFiltersChange({ ...filters, industry: v as Filters["industry"] })}
            options={[all("All industries"), ...INDUSTRIES.map((i) => ({ value: i, label: i }))]}
          />
          <FilterSelect
            label="Urgency"
            value={filters.urgency}
            onChange={(v) => onFiltersChange({ ...filters, urgency: v as Filters["urgency"] })}
            options={[all("All urgencies"), ...URGENCIES.map((u) => ({ value: u, label: u[0] + u.slice(1).toLowerCase() }))]}
          />
        </div>
      </div>

      {loading && signals.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel h-96 animate-pulse bg-slate-100/60" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 py-20 text-center text-slate-500">
          <Inbox className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="text-sm">No signals match the current search, period and filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          {signals.map((s) => (
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
      )}
    </section>
  );
}
