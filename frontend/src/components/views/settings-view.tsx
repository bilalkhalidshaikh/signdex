"use client";

import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getApiUrl } from "@/lib/api";
import { formatCurrencyCompact } from "@/lib/utils";
import type { ViewProps } from "./types";

export function SettingsView({ feed, onOpenPaywall }: ViewProps) {
  const c = feed.config;
  const rows: [string, string][] = c
    ? [
        ["API base URL", getApiUrl() || "not configured"],
        ["API version", c.version],
        ["Database", c.database],
        ["AchroCall mode", c.achrocallMode.toUpperCase()],
        ["AchroCall webhook", c.achrocallWebhookConfigured ? "Configured" : "Not set (sandbox)"],
        ["Sandbox call completion", c.sandboxAutoComplete ? `Auto, ${c.sandboxCallSeconds[0]}–${c.sandboxCallSeconds[1]} s after dispatch` : "Disabled"],
        ["Pipeline ARR assumption", `${formatCurrencyCompact(c.arrPerLocation)} per location / year (placeholder)`],
        ["Demo data refresh", `Rebuilt on startup if older than ${c.reseedIfStaleHours} h`],
        ["Vapi live voice", c.vapiLiveConfigured ? "Keys present" : "Not configured (scripted browser voice)"],
      ]
    : [];

  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Read-only runtime configuration. Secrets are never displayed."
        connection={feed.connection}
      />

      <section className="panel p-6">
        <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900">Runtime</h2>
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
          Production is enabled through backend environment variables (see <span className="mono text-slate-600">backend/.env.example</span>):{" "}
          <span className="mono text-slate-600">ACHROCALL_WEBHOOK_URL</span>, <span className="mono text-slate-600">ACHROCALL_API_KEY</span>,{" "}
          <span className="mono text-slate-600">ACHROCALL_CALLBACK_SECRET</span>, and <span className="mono text-slate-600">DATABASE_URL</span>{" "}
          for PostgreSQL. Live signal providers are provisioned separately.
        </p>
        <button type="button" onClick={onOpenPaywall} className="btn btn-ghost mt-5">
          <ShieldAlert className="h-4 w-4" /> Production access notice
        </button>
      </section>
    </>
  );
}
