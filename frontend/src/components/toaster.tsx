"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertTriangle, CheckCircle2, Info, Radar, X } from "lucide-react";
import { useEffect, useState } from "react";
import { subscribeToasts, type ToastMessage, type ToastVariant } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  signal: Radar,
};

const TONES: Record<ToastVariant, string> = {
  success: "text-emerald-600",
  error: "text-rose-600",
  info: "text-indigo-600",
  signal: "text-indigo-600",
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(
    () =>
      subscribeToasts((t) => {
        setToasts((prev) => [...prev.slice(-3), t]);
      }),
    [],
  );

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
            className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-float transition-opacity data-[state=closed]:opacity-0 data-[state=open]:animate-slide-in"
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", TONES[t.variant])} aria-hidden />
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-sm font-semibold text-slate-900">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 break-words text-xs leading-relaxed text-slate-500">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close aria-label="Dismiss" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
