"use client";

import { Check, Loader2, Mic, ScrollText, Send } from "lucide-react";
import { useState } from "react";
import { STAGE_STYLES, stageFor } from "@/lib/analytics";
import { dispatchToAchroCall } from "@/lib/api";
import { toast } from "@/lib/toast";
import { PROVIDER_NAMES, SOURCE_LABELS, type B2BSignal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  signals: B2BSignal[]; // already filtered, sorted and paginated by the feed
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

/** Dense table view of the same list the cards show (not a second, different list). */
export function LeadTable({ signals, onUpdated, onPitch, onViewLog, onTelemetry }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  async function dispatch(s: B2BSignal) {
    setBusy(s.id);
    try {
      const res = await dispatchToAchroCall(s.id);
      onUpdated(res.signal);
      toast({
        title: res.mode === "live" ? "Call queued" : "Call queued (demo mode)",
        description: res.message,
        variant: "success",
      });
    } catch (e) {
      toast({ title: "Couldn't queue the call", description: e instanceof Error ? e.message : "Please try again.", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-3 py-3 font-medium">Industry · location</th>
              <th className="px-3 py-3 font-medium">Found on</th>
              <th className="px-3 py-3 font-medium">Fit score</th>
              <th className="px-3 py-3 font-medium">Stage</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const stage = stageFor(s);
              const synced = s.achroCallStatus !== "PENDING";
              return (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600" aria-hidden>
                        {initials(s.decisionMaker.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{s.companyName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {s.decisionMaker.name} · {s.decisionMaker.title}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-slate-600">
                    <p className="truncate">{s.industry}</p>
                    <p className="truncate text-xs text-slate-500">{s.city && s.state ? `${s.city}, ${s.state}` : "—"}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <button
                      type="button"
                      onClick={() => onTelemetry(s)}
                      title={`${SOURCE_LABELS[s.sourceChannel]}. See how we found this lead.`}
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
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => dispatch(s)}
                        disabled={synced || busy === s.id}
                        aria-label={synced ? `Call already queued for ${s.companyName}` : `Dispatch call to ${s.companyName}`}
                        title={synced ? "Call already queued" : "Dispatch Call"}
                        className={cn("btn px-2.5 py-1.5", synced ? "btn-ghost" : "btn-primary")}
                      >
                        {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : synced ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onPitch(s)}
                        aria-label={`Preview AI call for ${s.companyName}`}
                        title="Preview AI Call"
                        className="btn btn-ghost px-2.5 py-1.5"
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      {s.callLog && (
                        <button
                          type="button"
                          onClick={() => onViewLog(s)}
                          aria-label={`View call transcript for ${s.companyName}`}
                          title="View transcript"
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
    </div>
  );
}
