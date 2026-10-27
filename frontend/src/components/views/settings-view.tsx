"use client";

import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getApiUrl } from "@/lib/api";
import { formatCurrencyCompact } from "@/lib/utils";
import type { ViewProps } from "./types";

export function SettingsView({ feed, onOpenPaywall }: ViewProps) {
  const c = feed.config;
  const rows: [string, string][] = c
    ? [
        ["Server address", getApiUrl() || "Not set"],
        ["Version", c.version],
        ["Data storage", c.database === "postgresql" ? "PostgreSQL" : "Local file (demo)"],
        ["Calling mode", c.achrocallMode === "live" ? "Live" : "Demo"],
        ["Calling system connection", c.achrocallWebhookConfigured ? "Connected" : "Not connected (demo)"],
        ["Demo calls", c.sandboxAutoComplete ? `Finish on their own after ${c.sandboxCallSeconds[0]}–${c.sandboxCallSeconds[1]} seconds` : "Stay in the queue"],
        ["Value per location", `${formatCurrencyCompact(c.arrPerLocation)} per year (an estimate, not real pricing)`],
        ["Demo data refresh", `Refreshed on restart if older than ${c.reseedIfStaleHours} hours`],
        ["Live voice", c.vapiLiveConfigured ? "Connected" : "Not connected (the demo uses a scripted voice)"],
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="How this workspace is set up. This page is read-only, and passwords and keys are never shown."
        connection={feed.connection}
      />

      <section className="panel p-6">
        <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900">Workspace setup</h2>
        {rows.length === 0 && <div className="h-40 animate-pulse rounded-lg bg-slate-50" />}
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
            <span className="text-sm text-slate-500">{k}</span>
            <span className="mono text-xs text-slate-800">{v}</span>
          </div>
        ))}
      </section>

      <section className="panel p-6">
        <h2 className="mb-3 text-base font-semibold tracking-tight text-slate-900">Going live</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
          Going live means your technical team adds a few server settings (listed in <span className="mono text-slate-600">backend/.env.example</span>):
          the AchroCall connection address and key (<span className="mono text-slate-600">ACHROCALL_WEBHOOK_URL</span>,{" "}
          <span className="mono text-slate-600">ACHROCALL_API_KEY</span>), a key for call results (<span className="mono text-slate-600">ACHROCALL_CALLBACK_SECRET</span>),
          and a production database (<span className="mono text-slate-600">DATABASE_URL</span>). Live lead sources are set up separately.
        </p>
        <button type="button" onClick={onOpenPaywall} className="btn btn-ghost mt-5">
          <Info className="h-4 w-4" /> What changes when we go live
        </button>
      </section>
    </>
  );
}
