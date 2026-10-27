"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Info, X } from "lucide-react";

const ROWS: { area: string; demo: string; live: string }[] = [
  {
    area: "Leads",
    demo: "Sample leads that look like LinkedIn, Indeed, Google Maps, Crunchbase and Apollo results.",
    live: "Real leads collected from live sources such as LinkedIn, Apollo and BrightData.",
  },
  {
    area: "Contacts",
    demo: "Made-up companies and people. Phone numbers are reserved test numbers.",
    live: "Real decision-makers with verified contact details.",
  },
  {
    area: "Calling",
    demo: "Queuing a call only adds it to a demo queue. Nothing is sent out.",
    live: "Calls are placed by AchroCall's AI calling system to real prospects.",
  },
  {
    area: "Call results",
    demo: "A scripted sample call, with a made-up result and transcript.",
    live: "Real call results and transcripts come back from AchroCall.",
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
                <Info className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="heading text-lg">Demo vs. going live</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-sm text-slate-500">What you&apos;re seeing today and what changes when we switch on live data and calling.</Dialog.Description>
              </div>
            </div>
            <Dialog.Close aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:w-9">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-5 overflow-y-auto p-5 text-sm leading-relaxed text-slate-600">
            <p>
              The demo shows the <strong className="text-slate-900">whole workflow</strong>: finding leads, scoring them, queuing a call, hearing the AI call,
              reading the transcript, and exporting to your CRM. Going live connects that same workflow to real lead sources and real calling.
            </p>

            <div className="overflow-hidden rounded-md border border-slate-100">
              <div className="hidden grid-cols-[7rem_1fr_1fr] bg-slate-50 px-4 py-2 sm:grid">
                <span className="eyebrow">Area</span>
                <span className="eyebrow">Demo (today)</span>
                <span className="eyebrow text-emerald-600">Live</span>
              </div>
              {ROWS.map((r) => (
                <div key={r.area} className="grid gap-1 border-t border-slate-100 px-4 py-3 sm:grid-cols-[7rem_1fr_1fr] sm:gap-4">
                  <span className="text-sm font-medium text-slate-900">{r.area}</span>
                  <span className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400 sm:hidden">Demo: </span>
                    {r.demo}
                  </span>
                  <span className="text-xs text-slate-600">
                    <span className="font-medium text-emerald-600 sm:hidden">Live: </span>
                    {r.live}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Why live data and calls cost extra</h3>
              <ul className="space-y-1.5">
                {[
                  "Data collection: the web traffic needed to gather leads from live sources.",
                  "Data credits: charges from lead-data providers for each contact record.",
                  "Call time: the cost of placing and processing real AI calls.",
                ].map((t) => (
                  <li key={t} className="flex gap-2 text-xs text-slate-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-achrocall" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <p className="rounded-xl border border-amber-200/70 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900/80">
              Live lead sources (LinkedIn, Apollo, BrightData) and AchroCall&apos;s production calling are set up once you commit. Scope, timing and
              pricing are agreed with SignDex before anything goes live.
            </p>
          </div>

          <div className="flex justify-end border-t border-slate-100 p-4">
            <Dialog.Close className="btn btn-primary">Got it</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
