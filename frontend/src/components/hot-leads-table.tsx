"use client";

import { ArrowUpDown, Check, Loader2, Mic, ScrollText, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { STAGE_STYLES, stageFor } from "@/lib/analytics";
import { dispatchToAchroCall } from "@/lib/api";
import { toast } from "@/lib/toast";
import { PROVIDER_NAMES, SOURCE_LABELS, type B2BSignal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  signals: B2BSignal[];
  onUpdated: (s: B2BSignal) => void;
  onPitch: (s: B2BSignal) => void;
  onViewLog: (s: B2BSignal) => void;
  onTelemetry: (s: B2BSignal) => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export function HotLeadsTable({ signals, onUpdated, onPitch, onViewLog, onTelemetry }: Props) {
  const [sort, setSort] = useState<"score" | "recent">("score");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const copy = [...signals];
    copy.sort((a, b) =>
      sort === "score" ? b.aiOpportunityScore - a.aiOpportunityScore : new Date(b.detectedTimestamp).getTime() - new Date(a.detectedTimestamp).getTime(),
    );
    return copy.slice(0, 8);
  }, [signals, sort]);

  async function dispatch(s: B2BSignal) {
    setBusy(s.id);
    try {
      const res = await dispatchToAchroCall(s.id);
      onUpdated(res.signal);
      toast({
        title: res.mode === "live" ? "Dispatched to AchroCall" : "Dispatched to AchroCall (Sandbox Mode)",
        description: res.message,
        variant: "success",
      });
    } catch (e) {
      toast({ title: "Dispatch failed", description: e instanceof Error ? e.message : "Unknown error", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel overflow-hidden" aria-label="Hot leads to follow up">
      <div className="flex flex-wrap items-start justify-between gap-3 p-6 pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Hot leads to follow up</h2>
          <p className="mt-1 text-sm text-slate-500">{sort === "score" ? "Highest AI intent scores" : "Most recently detected"} in this period</p>
        </div>
        <button type="button" onClick={() => setSort((v) => (v === "score" ? "recent" : "score"))} className="btn btn-ghost py-1.5">
          <ArrowUpDown className="h-4 w-4" />
          Sort: {sort === "score" ? "Score" : "Newest"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 pb-10 pt-4 text-center text-sm text-slate-500">No leads match the current search and filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                <th className="px-6 py-3 font-medium">Lead</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Score</th>
                <th className="px-3 py-3 font-medium">Stage</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const stage = stageFor(s);
                const synced = s.achroCallStatus !== "PENDING";
                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600" aria-hidden>
                          {initials(s.decisionMaker.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{s.decisionMaker.name}</p>
                          <p className="truncate text-xs text-slate-500">{s.companyName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => onTelemetry(s)}
                        title={`${SOURCE_LABELS[s.sourceChannel]} (view source telemetry)`}
                        className="rounded-lg text-slate-700 underline-offset-4 hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        {PROVIDER_NAMES[s.sourceChannel]}
                      </button>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-7 font-semibold tabular-nums text-slate-900">{s.aiOpportunityScore}</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                          <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${s.aiOpportunityScore}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STAGE_STYLES[stage])}>{stage}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => dispatch(s)}
                          disabled={synced || busy === s.id}
                          aria-label={synced ? `${s.companyName} already dispatched` : `Dispatch ${s.companyName} to AchroCall`}
                          title={synced ? "Already dispatched" : "Dispatch to AchroCall"}
                          className={cn("btn px-2.5 py-1.5", synced ? "btn-ghost" : "btn-primary")}
                        >
                          {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : synced ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPitch(s)}
                          aria-label={`Trigger AI pitch demo for ${s.companyName}`}
                          title="Trigger AI pitch demo"
                          className="btn btn-ghost px-2.5 py-1.5"
                        >
                          <Mic className="h-4 w-4" />
                        </button>
                        {s.callLog && (
                          <button
                            type="button"
                            onClick={() => onViewLog(s)}
                            aria-label={`View voice log for ${s.companyName}`}
                            title="View voice log"
                            className="btn btn-ghost px-2.5 py-1.5"
                          >
                            <ScrollText className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
