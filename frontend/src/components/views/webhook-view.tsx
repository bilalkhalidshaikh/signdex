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
        title="Webhook Routing"
        subtitle="How qualified signals are routed to AchroCall, and the exact payload each dispatch sends."
        connection={feed.connection}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel p-6">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900">AchroCall endpoint</h2>
          <Row k="Mode" v={cfg ? cfg.achrocallMode.toUpperCase() : "—"} tone={cfg?.achrocallMode === "live" ? "text-emerald-600" : "text-amber-600"} />
          <Row k="Outbound webhook" v={cfg ? (cfg.achrocallWebhookConfigured ? "Configured" : "Not set (sandbox: nothing leaves this system)") : "—"} />
          <Row k="Inbound call-outcome callback" v={cfg ? `POST ${cfg.callbackPath}` : "—"} />
          <Row k="Callback secret required" v={cfg ? (cfg.callbackSecretRequired ? "Yes" : "No") : "—"} />
        </section>

        <section className="panel p-6">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900">Routing rules</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Signal type</th>
                  <th className="pb-3 pr-4 font-medium">Route</th>
                  <th className="pb-3 text-right font-medium">Signals</th>
                </tr>
              </thead>
              <tbody>
                {SIGNAL_TYPES.map((t) => (
                  <tr key={t} className="border-t border-slate-100">
                    <td className="py-3 pr-4 text-slate-800">{SIGNAL_LABELS[t]}</td>
                    <td className="mono py-3 pr-4 text-xs text-emerald-600">outbound_ai_receptionist_pitch</td>
                    <td className="py-3 text-right tabular-nums text-slate-600">{feed.allSignals.filter((s) => s.signalType === t).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500">Call priority mirrors the lead&apos;s urgency (Critical / High / Medium).</p>
        </section>
      </div>

      <section className="panel p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Payload preview</h2>
            <p className="mt-1 text-sm text-slate-500">Preview only. Nothing is sent.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Lead to preview"
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
              onClick={async () =>
                toast(
                  (await copyText(payload))
                    ? { title: "Payload copied", variant: "success" }
                    : { title: "Copy failed", description: "Clipboard blocked by the browser.", variant: "error" },
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
          <pre className="mono max-h-96 overflow-auto rounded-lg bg-slate-50 p-5 text-xs leading-5 text-slate-600">
            {payload || "No leads yet."}
          </pre>
        )}
      </section>
    </>
  );
}
