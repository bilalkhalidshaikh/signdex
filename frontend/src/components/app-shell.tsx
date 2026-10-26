"use client";

import { ChevronRight, Network, PhoneCall, Radar, RefreshCw, Settings, Webhook, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NoticeBanner } from "./notice-banner";

export type TabId = "radar" | "swarms" | "webhooks" | "crm" | "voice" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

export const TABS: Tab[] = [
  { id: "radar", label: "Live Radar", icon: Radar },
  { id: "swarms", label: "Campaign Swarms", icon: Network },
  { id: "webhooks", label: "Webhook Routing", icon: Webhook },
  { id: "crm", label: "CRM Sync", icon: RefreshCw },
  { id: "voice", label: "Voice Core (AchroCall)", icon: PhoneCall },
  { id: "settings", label: "System Settings", icon: Settings },
];

const SECTIONS: { title: string | null; ids: TabId[] }[] = [
  { title: null, ids: ["radar", "swarms"] },
  { title: "Pipeline", ids: ["webhooks", "crm", "voice"] },
  { title: "System", ids: ["settings"] },
];

interface Props {
  tab: TabId;
  onTab: (t: TabId) => void;
  onOpenPaywall: () => void;
  badges: Partial<Record<TabId, string>>;
  children: ReactNode;
}

function Brand() {
  return (
    // Full-colour logo on a white background; the tile is white so the image blends into it.
    <div className="w-full max-w-[16rem] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/signdex-brand.png" width={770} height={279} alt="SignDex: Intelligence, Opportunity, Revenue" className="block h-auto w-full" />
    </div>
  );
}

export function AppShell({ tab, onTab, onOpenPaywall, badges, children }: Props) {
  const byId = Object.fromEntries(TABS.map((t) => [t.id, t])) as Record<TabId, Tab>;
  return (
    <div className="flex min-h-screen flex-col">
      <NoticeBanner onLearnMore={onOpenPaywall} />

      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start border-r border-slate-200/70 bg-white/70 backdrop-blur-xl lg:flex">
          <div className="px-5 py-6">
            <Brand />
          </div>

          <nav aria-label="Primary" className="flex-1 space-y-6 overflow-y-auto px-3">
            {SECTIONS.map((sec, i) => (
              <div key={i}>
                {sec.title && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{sec.title}</p>}
                <div className="space-y-1">
                  {sec.ids.map((id) => {
                    const { label, icon: Icon } = byId[id];
                    const active = tab === id;
                    const badge = badges[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onTab(id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                          active ? "bg-white text-slate-900 shadow-card ring-1 ring-slate-200/70" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand" : "text-slate-400")} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {badge && (
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", active ? "bg-brand/10 text-brand" : "bg-slate-100 text-slate-600")}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-3 border-t border-slate-200/70 p-4">
            <button
              type="button"
              onClick={onOpenPaywall}
              className="flex w-full items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 text-left transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-amber-900">Sandbox environment</span>
                <span className="block truncate text-xs text-amber-700/80">Production access</span>
              </span>
              <ChevronRight className="h-4 w-4 text-amber-600" aria-hidden />
            </button>
            <div className="flex items-center gap-3 px-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand" aria-hidden>
                SD
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium text-slate-900">SignDex</p>
                <p className="truncate text-xs text-slate-500">Demo workspace</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile / tablet nav */}
          <div className="border-b border-slate-200/70 bg-white/70 backdrop-blur lg:hidden">
            <div className="px-4 pt-4 sm:px-8">
              <Brand />
            </div>
            <nav aria-label="Primary" className="flex gap-1 overflow-x-auto px-3 py-3 sm:px-7">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium",
                    tab === id ? "bg-white text-slate-900 shadow-card ring-1 ring-slate-200/70" : "text-slate-600",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <main className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
