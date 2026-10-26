"use client";

import { useMemo, useState } from "react";
import { AppShell, type TabId } from "@/components/app-shell";
import { CallLogModal } from "@/components/call-log-modal";
import { PaywallModal } from "@/components/paywall-modal";
import { TelemetryModal } from "@/components/telemetry-modal";
import { Toaster } from "@/components/toaster";
import { CrmView } from "@/components/views/crm-view";
import { RadarView } from "@/components/views/radar-view";
import { SettingsView } from "@/components/views/settings-view";
import { SwarmsView } from "@/components/views/swarms-view";
import { VoiceView } from "@/components/views/voice-view";
import { WebhookView } from "@/components/views/webhook-view";
import { VoiceModal } from "@/components/voice-modal";
import { useNow } from "@/hooks/use-now";
import { useSignalFeed } from "@/hooks/use-signal-feed";
import { inRange, matchesQuery, type Range } from "@/lib/analytics";
import { simulateSignal } from "@/lib/api";
import { toast } from "@/lib/toast";
import { SIGNAL_LABELS, SOURCE_LABELS, type B2BSignal, type Filters } from "@/lib/types";

const DEFAULT_FILTERS: Filters = { signalType: "ALL", industry: "ALL", urgency: "ALL" };

export default function Page() {
  const [tab, setTab] = useState<TabId>("radar");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [range, setRange] = useState<Range>("24h");
  const [query, setQuery] = useState("");
  const [pitchSignal, setPitchSignal] = useState<B2BSignal | null>(null);
  const [logSignalId, setLogSignalId] = useState<string | null>(null);
  const [telemetryId, setTelemetryId] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const feed = useSignalFeed(filters);
  const now = useNow(30_000);

  // Period only (drives KPIs, charts, rail) vs period + filters + search (drives the table and feed).
  const rangeSignals = useMemo(() => inRange(feed.allSignals, range, now), [feed.allSignals, range, now]);
  const visible = useMemo(
    () => inRange(feed.signals, range, now).filter((s) => matchesQuery(s, query)),
    [feed.signals, range, now, query],
  );

  const badges = useMemo(() => {
    const lastHour = feed.allSignals.filter((s) => now - new Date(s.detectedTimestamp).getTime() <= 3600_000).length;
    const pending = feed.allSignals.filter((s) => s.achroCallStatus === "PENDING").length;
    const live = feed.allSignals.filter((s) => s.achroCallStatus === "DISPATCHED_TO_ACHROCALL").length;
    return {
      radar: lastHour > 0 ? `${lastHour} new` : undefined,
      swarms: pending > 0 ? String(pending) : undefined,
      voice: live > 0 ? `${live} live` : undefined,
    };
  }, [feed.allSignals, now]);

  async function simulate() {
    setSimulating(true);
    try {
      const s = await simulateSignal();
      feed.applySignal(s, { fresh: true });
      toast({
        title: `New signal: ${s.companyName}`,
        description: `${SIGNAL_LABELS[s.signalType]} • ${s.signalUrgency} • ${SOURCE_LABELS[s.sourceChannel]} • AI fit ${s.aiOpportunityScore}`,
        variant: "signal",
      });
    } catch (e) {
      toast({ title: "Simulation failed", description: e instanceof Error ? e.message : "Unknown error", variant: "error" });
    } finally {
      setSimulating(false);
    }
  }

  function startPitch(s: B2BSignal) {
    feed.pushEvent("VAPI", `Demo pitch session started: ${s.decisionMaker.name} @ ${s.companyName}`);
    setPitchSignal(s);
  }

  const common = {
    feed,
    onPitch: startPitch,
    onViewLog: (s: B2BSignal) => setLogSignalId(s.id),
    onTelemetry: (s: B2BSignal) => setTelemetryId(s.id),
    onOpenPaywall: () => setPaywallOpen(true),
    onTab: setTab,
  };

  return (
    <>
      <AppShell tab={tab} onTab={setTab} onOpenPaywall={() => setPaywallOpen(true)} badges={badges}>
        {tab === "radar" && (
          <RadarView
            {...common}
            filters={filters}
            onFilters={setFilters}
            range={range}
            onRange={setRange}
            query={query}
            onQuery={setQuery}
            rangeSignals={rangeSignals}
            visible={visible}
            now={now}
            simulating={simulating}
            onSimulate={simulate}
          />
        )}
        {tab === "swarms" && <SwarmsView {...common} />}
        {tab === "webhooks" && <WebhookView {...common} />}
        {tab === "crm" && <CrmView {...common} />}
        {tab === "voice" && <VoiceView {...common} />}
        {tab === "settings" && <SettingsView {...common} />}
      </AppShell>

      <VoiceModal signal={pitchSignal} onClose={() => setPitchSignal(null)} />
      <CallLogModal signal={feed.allSignals.find((s) => s.id === logSignalId) ?? null} onClose={() => setLogSignalId(null)} />
      <TelemetryModal signal={feed.allSignals.find((s) => s.id === telemetryId) ?? null} onClose={() => setTelemetryId(null)} />
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <Toaster />
    </>
  );
}
