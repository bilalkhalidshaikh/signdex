"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Bot, CheckCircle2, Clock, User, X } from "lucide-react";
import type { B2BSignal } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmt(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CallLogModal({ signal, onClose }: { signal: B2BSignal | null; onClose: () => void }) {
  const log = signal?.callLog ?? null;
  return (
    <Dialog.Root open={signal !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold text-slate-900">
                Call Transcript — {signal?.companyName}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-slate-500">
                Outbound AI call to {signal?.decisionMaker.name}, {signal?.decisionMaker.title}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {log && (
            <>
              <div className="space-y-3 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-achrocall/40 bg-achrocall/10 px-2 py-1 font-semibold text-achrocall">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {log.outcome}
                  </span>
                  {log.durationSeconds > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> {fmt(log.durationSeconds)}
                    </span>
                  )}
                  <span className="text-slate-500">Demo call</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{log.summary}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {log.transcript.length === 0 && <p className="text-sm text-slate-500">No transcript is available for this call.</p>}
                {log.transcript.map((t, i) => (
                  <div key={i} className={cn("flex gap-2.5", t.speaker === "prospect" && "flex-row-reverse")}>
                    <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", t.speaker === "agent" ? "bg-achrocall/15 text-achrocall" : "bg-brand/15 text-indigo-600")}>
                      {t.speaker === "agent" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </div>
                    <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed", t.speaker === "agent" ? "rounded-tl-sm bg-slate-100 text-slate-800" : "rounded-tr-sm bg-brand/20 text-slate-800")}>
                      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        {t.speaker === "agent" ? "Ava (AI)" : signal?.decisionMaker.name.split(" ")[0]}
                      </p>
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
