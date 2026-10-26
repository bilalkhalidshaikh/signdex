"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { SIGNAL_LABELS, SOURCE_LABELS, type B2BSignal } from "@/lib/types";

function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TelemetryModal({ signal, onClose }: { signal: B2BSignal | null; onClose: () => void }) {
  return (
    <Dialog.Root open={signal !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-float focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-slate-900">Source telemetry</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                How the signal for {signal?.companyName} was acquired.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {signal && (
            <div className="space-y-5 p-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Source channel</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{SOURCE_LABELS[signal.sourceChannel]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Signal type</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{SIGNAL_LABELS[signal.signalType]}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Intercepted</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{stamp(signal.detectedTimestamp)}</dd>
                </div>
              </dl>

              {signal.sourceTelemetry.length > 0 && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-medium text-slate-500">Matching telemetry</p>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    {signal.sourceTelemetry.map((t) => (
                      <div key={t.label} className="min-w-0">
                        <dt className="text-xs text-slate-500">{t.label}</dt>
                        <dd className="mt-0.5 break-words font-medium text-slate-800">{t.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <p className="rounded-2xl border border-amber-200/70 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900/80">
                <span className="font-semibold text-amber-950">Sandbox feed.</span> This channel and its telemetry are simulated. In production, the
                same fields are reported by live scraping clusters and paid B2B data providers.
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
