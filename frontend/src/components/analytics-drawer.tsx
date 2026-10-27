"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CapturedBarChart, ReadinessChart, SourceTrendChart, TypeDonut } from "@/components/charts";
import { MetricsBar } from "@/components/metrics-bar";
import { ActivityFeed, FollowUps, PipelineSummary, SetupCard, TopSources } from "@/components/right-rail";
import type { Range } from "@/lib/analytics";
import { RANGES } from "@/lib/analytics";
import type { B2BSignal } from "@/lib/types";
import type { TabId } from "./app-shell";
import type { ViewProps } from "./views/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feed: ViewProps["feed"];
  rangeSignals: B2BSignal[];
  range: Range;
  now: number;
  perLocation: number;
  onOpenPaywall: () => void;
  onTab: (t: TabId) => void;
}

/**
 * Every chart, KPI and pipeline widget lives here, in a slide-over that is closed by default.
 * It takes no space in the page, so the lead feed is always the first thing on screen.
 * (Dialog content only mounts while open, so the charts cost nothing until someone asks for them.)
 */
export function AnalyticsDrawer({ open, onOpenChange, feed, rangeSignals, range, now, perLocation, onOpenPaywall, onTab }: Props) {
  const periodLabel = RANGES.find((r) => r.value === range)?.label.toLowerCase() ?? "";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full animate-slide-left flex-col bg-slate-50 shadow-float focus:outline-none sm:w-[min(62rem,94vw)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 bg-white px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-slate-900">Reports</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-slate-500">
                Key numbers and trends for the {periodLabel}. Change the period in the top bar.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close reports" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <MetricsBar signals={rangeSignals} range={range} now={now} perLocation={perLocation} loading={feed.loading} />
            <SourceTrendChart signals={rangeSignals} range={range} now={now} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CapturedBarChart signals={rangeSignals} range={range} now={now} />
              <TypeDonut signals={rangeSignals} />
            </div>
            <ReadinessChart signals={rangeSignals} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-6">
                <SetupCard config={feed.config} onOpen={onOpenPaywall} />
                <PipelineSummary
                  signals={rangeSignals}
                  perLocation={perLocation}
                  config={feed.config}
                  onTab={(t) => {
                    onOpenChange(false);
                    onTab(t);
                  }}
                />
                <TopSources signals={rangeSignals} />
              </div>
              <div className="flex flex-col gap-6">
                <FollowUps signals={rangeSignals} now={now} onUpdated={feed.applySignal} />
                <ActivityFeed events={feed.events} now={now} />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
