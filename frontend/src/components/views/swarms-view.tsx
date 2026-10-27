"use client";

import { Loader2, Rocket } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { dispatchToAchroCall } from "@/lib/api";
import { toast } from "@/lib/toast";
import { INDUSTRIES, PROVIDER_NAMES, type Industry } from "@/lib/types";
import type { ViewProps } from "./types";

export function SwarmsView({ feed }: ViewProps) {
  const [busy, setBusy] = useState<Industry | null>(null);
  const live = feed.config?.achrocallMode === "live";

  async function deploy(industry: Industry) {
    const targets = feed.allSignals.filter((s) => s.industry === industry && s.achroCallStatus === "PENDING");
    if (targets.length === 0) return;
    if (live && !window.confirm(`Start ${targets.length} real ${targets.length === 1 ? "call" : "calls"}? This will place live outbound calls to these prospects.`)) return;
    setBusy(industry);
    let ok = 0;
    for (const s of targets) {
      try {
        const res = await dispatchToAchroCall(s.id);
        feed.applySignal(res.signal);
        ok += 1;
      } catch (e) {
        toast({ title: `Campaign stopped at ${s.companyName}`, description: e instanceof Error ? e.message : "Couldn't queue the call.", variant: "error" });
        break;
      }
    }
    setBusy(null);
    if (ok > 0) {
      toast({
        title: `Campaign started: ${industry}`,
        description: `${ok} ${ok === 1 ? "call" : "calls"} queued${live ? "" : " (demo mode)"}`,
        variant: "success",
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="One campaign per industry. Start a campaign to queue a call for every lead in that industry that hasn't been called yet."
        connection={feed.connection}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {INDUSTRIES.map((ind) => {
          const list = feed.allSignals.filter((s) => s.industry === ind);
          const pending = list.filter((s) => s.achroCallStatus === "PENDING").length;
          const inFlight = list.filter((s) => s.achroCallStatus === "DISPATCHED_TO_ACHROCALL").length;
          const done = list.filter((s) => s.achroCallStatus === "CALL_COMPLETED").length;
          const avg = list.length ? Math.round(list.reduce((n, s) => n + s.aiOpportunityScore, 0) / list.length) : 0;
          const sources = [...new Set(list.map((s) => PROVIDER_NAMES[s.sourceChannel]))];
          const pct = list.length ? Math.round(((inFlight + done) / list.length) * 100) : 0;
          return (
            <section key={ind} className="panel flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">{ind}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {list.length} {list.length === 1 ? "lead" : "leads"} • average fit score {avg || "—"} • {sources.join(", ") || "no sources yet"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["Not called", pending, "text-slate-800"],
                  ["Calling", inFlight, "text-amber-600"],
                  ["Called", done, "text-emerald-600"],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-lg bg-slate-50 py-3">
                    <p className={`text-2xl font-semibold tabular-nums ${c}`}>{v}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-achrocall transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{pct}% of leads called or in the queue</p>
              </div>
              <button
                type="button"
                onClick={() => deploy(ind)}
                disabled={pending === 0 || busy !== null}
                className="btn btn-primary mt-auto"
              >
                {busy === ind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Start Campaign ({pending})
              </button>
            </section>
          );
        })}
      </div>
    </>
  );
}
