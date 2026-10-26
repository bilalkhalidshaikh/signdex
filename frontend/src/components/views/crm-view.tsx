"use client";

import { FileJson, Loader2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { exportProfile } from "@/lib/api";
import { copyText, toast } from "@/lib/toast";
import { SIGNAL_LABELS } from "@/lib/types";
import type { ViewProps } from "./types";

const CONNECTORS = ["Apollo", "Clay"];

export function CrmView({ feed }: ViewProps) {
  const [busy, setBusy] = useState<string | null>(null);

  async function copyOne(id: string, label: string) {
    setBusy(id);
    try {
      const ok = await copyText(JSON.stringify(await exportProfile(id), null, 2));
      toast(
        ok
          ? { title: "Apollo/Clay payload copied", description: label, variant: "success" }
          : { title: "Copy failed", description: "Clipboard blocked by the browser.", variant: "error" },
      );
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Unknown error", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function copyAll() {
    setBusy("ALL");
    try {
      const rows = await Promise.all(feed.allSignals.slice(0, 50).map((s) => exportProfile(s.id)));
      const ok = await copyText(JSON.stringify(rows, null, 2));
      toast(
        ok
          ? { title: `${rows.length} profiles copied`, description: "Enriched profiles as a JSON array.", variant: "success" }
          : { title: "Copy failed", description: "Clipboard blocked by the browser.", variant: "error" },
      );
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Unknown error", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="CRM Sync"
        subtitle="Export enriched lead profiles to your enrichment and CRM tooling."
        connection={feed.connection}
        actions={
          <button type="button" onClick={copyAll} disabled={busy !== null || feed.allSignals.length === 0} className="btn btn-primary">
            {busy === "ALL" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
            Copy all ({Math.min(50, feed.allSignals.length)}) as JSON
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CONNECTORS.map((name) => (
          <div key={name} className="panel flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-base font-semibold text-slate-900">{name}</p>
              <p className="mt-1 text-sm text-slate-500">Payload export ready</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-medium text-emerald-600">Export active</p>
              <p className="mt-1 text-slate-500">Live sync awaits client API key</p>
            </div>
          </div>
        ))}
      </div>

      <section className="panel overflow-x-auto p-6">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              {["Company", "Contact", "Signal", "AchroCall", ""].map((h) => (
                <th key={h} className="pb-3 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {feed.allSignals.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="py-3 pr-4 font-medium text-slate-900">{s.companyName}</td>
                <td className="py-3 pr-4 text-slate-600">
                  {s.decisionMaker.name}
                  <span className="block text-xs text-slate-500">{s.decisionMaker.title}</span>
                </td>
                <td className="py-3 pr-4 text-slate-600">{SIGNAL_LABELS[s.signalType]}</td>
                <td className="py-3 pr-4 text-xs text-slate-500">
                  {{ PENDING: "Pending", DISPATCHED_TO_ACHROCALL: "Dispatched", CALL_COMPLETED: "Call completed" }[s.achroCallStatus]}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyOne(s.id, s.companyName)}
                    disabled={busy !== null}
                    className="btn btn-ghost py-1.5"
                  >
                    {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />} Copy payload
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
