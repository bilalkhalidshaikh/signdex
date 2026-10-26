"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, ShieldAlert, X } from "lucide-react";

const ROWS: { area: string; demo: string; production: string }[] = [
  {
    area: "Signal sources",
    demo: "Sandbox ingestion generates representative signals for LinkedIn, Indeed, Google Maps, Crunchbase and Apollo channels.",
    production: "Live scraping clusters and paid B2B data providers (LinkedIn, Apollo, BrightData and others) feed real signals.",
  },
  {
    area: "Contact data",
    demo: "Fictional companies and contacts; phone numbers use the reserved 555-01XX range.",
    production: "Real, enriched decision-maker records consumed from provider credits.",
  },
  {
    area: "AchroCall dispatch",
    demo: "Sandbox: payloads are built and recorded, nothing leaves this environment.",
    production: "Leads are posted to AchroCall production endpoints for real outbound AI voice calls.",
  },
  {
    area: "Voice & call logs",
    demo: "Scripted pitch voiced in the browser; call outcomes and transcripts are simulated.",
    production: "Live AI voice agent over telephony; outcomes and transcripts posted back by AchroCall.",
  },
];

export function PaywallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-float focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
                <ShieldAlert className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="heading text-lg">Live Provider APIs &amp; Production Access</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm text-slate-500">
                  Enterprise notice: what this sandbox demonstrates and what production deployment involves.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto p-5 text-sm leading-relaxed text-slate-600">
            <p>
              This sandbox illustrates <strong className="text-slate-900">100% of the workflow</strong>: signal detection and source
              attribution, AI opportunity scoring, dispatch to AchroCall, the outbound AI call, voice logs, and CRM export.
              Production deployment connects that same workflow to live scraping clusters and paid B2B data providers.
            </p>

            <div className="overflow-hidden rounded-md border border-slate-100">
              <div className="hidden grid-cols-[8rem_1fr_1fr] bg-slate-50 px-4 py-2 sm:grid">
                <span className="eyebrow">Area</span>
                <span className="eyebrow">Demo (sandbox)</span>
                <span className="eyebrow text-emerald-600">Production</span>
              </div>
              {ROWS.map((r) => (
                <div key={r.area} className="grid gap-1 border-t border-slate-100 px-4 py-3 sm:grid-cols-[8rem_1fr_1fr] sm:gap-4">
                  <span className="text-sm font-medium text-slate-900">{r.area}</span>
                  <span className="text-xs text-slate-500">{r.demo}</span>
                  <span className="text-xs text-slate-600">{r.production}</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Why production feeds carry usage fees</h3>
              <ul className="space-y-1.5">
                {[
                  "Proxy infrastructure: residential/rotating proxy bandwidth used by scraping clusters.",
                  "Provider credits: per-record enrichment and export charges from paid B2B data providers.",
                  "AchroCall production usage: live outbound voice calls and call-processing consumption.",
                ].map((t) => (
                  <li key={t} className="flex gap-2 text-xs text-slate-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-achrocall" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <p className="rounded-xl border border-amber-200/70 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900/80">
              Live provider APIs (LinkedIn, Apollo, BrightData, AchroCall production endpoints) are provisioned on client
              commitment. Scope, provisioning and pricing are agreed with SignDex before production feeds are enabled.
            </p>
          </div>

          <div className="flex justify-end border-t border-slate-100 p-4">
            <Dialog.Close className="btn btn-primary">Understood</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
