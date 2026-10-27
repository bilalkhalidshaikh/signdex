"use client";

import { FileJson, Loader2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { exportProfile } from "@/lib/api";
import { copyText, toast } from "@/lib/toast";
import { CALL_STATUS_LABELS, SIGNAL_LABELS } from "@/lib/types";
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
          ? { title: "Lead details copied", description: `${label} is ready to paste into your CRM.`, variant: "success" }
          : { title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "error" },
      );
    } catch (e) {
      toast({ title: "Couldn't export this lead", description: e instanceof Error ? e.message : "Please try again.", variant: "error" });
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
          ? { title: `${rows.length} ${rows.length === 1 ? "lead" : "leads"} copied`, description: "Full details for each lead, ready to paste into your CRM.", variant: "success" }
          : { title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "error" },
      );
    } catch (e) {
      toast({ title: "Couldn't export leads", description: e instanceof Error ? e.message : "Please try again.", variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="CRM Export"
        subtitle="Copy lead details into your CRM or sales tool, one lead at a time or in bulk."
        connection={feed.connection}
        actions={
          <button type="button" onClick={copyAll} disabled={busy !== null || feed.allSignals.length === 0} className="btn btn-primary">
            {busy === "ALL" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
            Export {Math.min(50, feed.allSignals.length)} Leads
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CONNECTORS.map((name) => (
          <div key={name} className="panel flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-base font-semibold text-slate-900">{name}</p>
              <p className="mt-1 text-sm text-slate-500">Copy-and-paste export is ready</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-medium text-emerald-600">Available now</p>
              <p className="mt-1 text-slate-500">Automatic sync is added when you go live</p>
            </div>
          </div>
        ))}
      </div>

      <section className="panel overflow-x-auto p-6">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              {["Company", "Contact", "Why it's a lead", "Call status", ""].map((h) => (
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
                  {CALL_STATUS_LABELS[s.achroCallStatus]}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyOne(s.id, s.companyName)}
                    disabled={busy !== null}
                    className="btn btn-ghost py-1.5"
                  >
                    {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />} Export Lead
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
