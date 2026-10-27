"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Menu, Network, PhoneCall, Radar, RefreshCw, Settings, Webhook, X, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NoticeBanner } from "./notice-banner";

export type TabId = "radar" | "swarms" | "webhooks" | "crm" | "voice" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

export const TABS: Tab[] = [
  { id: "radar", label: "Lead Radar", icon: Radar },
  { id: "swarms", label: "Campaigns", icon: Network },
  { id: "webhooks", label: "Call Routing", icon: Webhook },
  { id: "crm", label: "CRM Export", icon: RefreshCw },
  { id: "voice", label: "AI Calling System", icon: PhoneCall },
  { id: "settings", label: "Settings", icon: Settings },
];

const SECTIONS: { title: string | null; ids: TabId[] }[] = [
  { title: null, ids: ["radar", "swarms"] },
  { title: "Outreach", ids: ["voice", "webhooks", "crm"] },
  { title: "Account", ids: ["settings"] },
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

interface NavProps {
  tab: TabId;
  onTab: (t: TabId) => void;
  badges: Props["badges"];
  /** Called after any navigation/action so the mobile drawer can close itself. */
  onDone?: () => void;
}

/** The one navigation list, rendered in the desktop sidebar and inside the mobile drawer. */
function NavList({ tab, onTab, badges, onDone }: NavProps) {
  const byId = Object.fromEntries(TABS.map((t) => [t.id, t])) as Record<TabId, Tab>;
  return (
    <nav aria-label="Primary" className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
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
                  onClick={() => {
                    onTab(id);
                    onDone?.();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
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
  );
}

function SidebarFooter({ onOpenPaywall, onDone }: { onOpenPaywall: () => void; onDone?: () => void }) {
  return (
    <div className="space-y-3 border-t border-slate-200/70 p-4">
      <button
        type="button"
        onClick={() => {
          onDone?.();
          onOpenPaywall();
        }}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 text-left transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-amber-900">Demo mode</span>
          <span className="block truncate text-xs text-amber-700/80">What changes when live</span>
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
  );
}

export function AppShell({ tab, onTab, onOpenPaywall, badges, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = TABS.find((t) => t.id === tab);
  const CurrentIcon = current?.icon;

  return (
    <div className="flex min-h-screen flex-col">
      <NoticeBanner onLearnMore={onOpenPaywall} />

      <div className="flex flex-1">
        {/* Desktop (lg+): persistent sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start border-r border-slate-200/70 bg-white/70 backdrop-blur-xl lg:flex">
          <div className="px-5 py-6">
            <Brand />
          </div>
          <NavList tab={tab} onTab={onTab} badges={badges} />
          <SidebarFooter onOpenPaywall={onOpenPaywall} />
        </aside>

        <div className="min-w-0 flex-1">
          {/* Phones and tablets: slim top bar with a hamburger that opens the slide-out menu */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/70 bg-white/85 px-3 py-2 backdrop-blur-xl lg:hidden">
            <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  aria-haspopup="dialog"
                  aria-expanded={menuOpen}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-900/40 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] animate-slide-right flex-col bg-slate-50 shadow-float focus:outline-none">
                  <div className="flex items-start justify-between gap-3 px-4 py-4">
                    <div className="w-44">
                      <Brand />
                    </div>
                    <Dialog.Close
                      aria-label="Close navigation menu"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
                  <Dialog.Description className="sr-only">Switch between Lead Radar, Campaigns, AI Calling System, Call Routing, CRM Export and Settings.</Dialog.Description>
                  <NavList tab={tab} onTab={onTab} badges={badges} onDone={() => setMenuOpen(false)} />
                  <SidebarFooter onOpenPaywall={onOpenPaywall} onDone={() => setMenuOpen(false)} />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <div className="w-28 shrink-0 sm:w-32">
              <Brand />
            </div>
            <p className="ml-auto flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
              {CurrentIcon && <CurrentIcon className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
              <span className="truncate">{current?.label}</span>
            </p>
          </header>

          <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
