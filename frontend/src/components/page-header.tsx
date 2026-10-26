import type { ReactNode } from "react";
import type { Connection } from "@/hooks/use-signal-feed";
import { cn } from "@/lib/utils";

export function StatusBadge({ connection }: { connection: Connection }) {
  const live = connection === "live";
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm",
        live ? "border-slate-200 bg-white text-slate-700" : "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      {live
        ? "🟢 Sandbox Mode • AchroCall Active"
        : connection === "connecting"
          ? "🟠 Connecting…"
          : connection === "offline"
            ? "🔴 Backend not configured"
            : "🟠 Reconnecting…"}
    </span>
  );
}

interface Props {
  title: string;
  subtitle: ReactNode;
  connection: Connection;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, connection, actions }: Props) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge connection={connection} />
        {actions}
      </div>
    </header>
  );
}
