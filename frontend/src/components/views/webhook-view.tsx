"use client";

import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { getPayloadPreview } from "@/lib/api";
import { copyText, toast } from "@/lib/toast";
import { SIGNAL_LABELS, SIGNAL_TYPES } from "@/lib/types";
import type { ViewProps } from "./types";

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-slate-500">{k}</span>
      <span className={`mono text-right text-xs ${tone ?? "text-slate-800"}`}>{v}</span>
    </div>
  );
}

export function WebhookView({ feed }: ViewProps) {
  const cfg = feed.config;
  const [selected, setSelected] = useState<string>("");
  const [payload, setPayload] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const first = feed.allSignals[0]?.id ?? "";
  const id = selected || first;
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPayloadPreview(id)
      .then((p) => !cancelled && (setPayload(JSON.stringify(p, null, 2)), setErr(null)))
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Failed to load payload"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <PageHeader
        title="Call Routing"
        subtitle="How qualified leads reach the AI calling system, and exactly what is sent for each call."
        connection={feed.connection}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel p-6">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900">Calling system connection</h2>
          <Row k="Mode" v={cfg ? (cfg.achrocallMode === "live" ? "Live" : "Demo") : "—"} tone={cfg?.achrocallMode === "live" ? "text-emerald-600" : "text-amber-600"} />
          <Row k="Sending leads out" v={cfg ? (cfg.achrocallWebhookConfigured ? "Connected" : "Not connected (demo: nothing is sent out)") : "—"} />
          <Row k="Where call results arrive" v={cfg ? cfg.callbackPath : "—"} />
          <Row k="Results need a secret key" v={cfg ? (cfg.callbackSecretRequired ? "Yes" : "No") : "—"} />
        </section>

        <section className="panel p-6">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900">How leads are routed</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Why it&apos;s a lead</th>
                  <th className="pb-3 pr-4 font-medium">Call type</th>
                  <th className="pb-3 text-right font-medium">Leads</th>
                </tr>
              </thead>
              <tbody>
                {SIGNAL_TYPES.map((t) => (
                  <tr key={t} className="border-t border-slate-100">
                    <td className="py-3 pr-4 text-slate-800">{SIGNAL_LABELS[t]}</td>
                    <td className="py-3 pr-4 text-sm text-emerald-600">Outbound AI call</td>
                    <td className="py-3 text-right tabular-nums text-slate-600">{feed.allSignals.filter((s) => s.signalType === t).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500">Every call&apos;s priority matches the lead&apos;s priority (Critical, High or Medium).</p>
        </section>
      </div>

      <section className="panel p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Call details preview</h2>
            <p className="mt-1 text-sm text-slate-500">Exactly what would be sent for this lead. This is a preview, so nothing is sent.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Choose a lead to preview"
              value={id}
              onChange={(e) => setSelected(e.target.value)}
              className="max-w-[16rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-achrocall/60"
            >
              {feed.allSignals.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!payload}
              title="Copy the technical call details"
              onClick={async () =>
                toast(
                  (await copyText(payload))
                    ? { title: "Call details copied", variant: "success" }
                    : { title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "error" },
                )
              }
              className="btn btn-ghost"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
        </div>
        {err ? (
          <p className="text-sm text-rose-600">{err}</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-slate-600">
              Each call request includes the company and contact person, their phone and email, why the lead was found, its fit score and priority,
              and where to send the call result.
            </p>
            <button type="button" onClick={() => setShowRaw((v) => !v)} aria-expanded={showRaw} className="btn btn-ghost mt-4">
              {showRaw ? "Hide technical details" : "Show technical details (for your IT team)"}
            </button>
            {showRaw && (
              <pre className="mono mt-4 max-h-96 overflow-auto rounded-lg bg-slate-50 p-5 text-xs leading-5 text-slate-600">{payload || "No leads yet."}</pre>
            )}
          </>
        )}
      </section>
    </>
  );
}
