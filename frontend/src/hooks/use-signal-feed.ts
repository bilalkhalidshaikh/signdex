"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getAnalytics, getConfig, getMetrics, getPipeline, listSignals, streamUrl } from "@/lib/api";
import { matchesFilters } from "@/lib/search";
import { toast } from "@/lib/toast";
import {
  SIGNAL_LABELS,
  SOURCE_LABELS,
  type Analytics,
  type AppConfig,
  type B2BSignal,
  type Filters,
  type Metrics,
  type PipelineChannel,
} from "@/lib/types";

export type Connection = "connecting" | "live" | "reconnecting" | "offline";

const noopSubscribe = () => () => {};

export type TermTag = "SYS" | "INGEST" | "RADAR" | "WEBHOOK" | "ACHROCALL" | "VAPI";
export interface TermEvent {
  id: number;
  ts: number;
  tag: TermTag;
  text: string;
}

const NO_FILTERS: Filters = { signalType: "ALL", industry: "ALL", urgency: "ALL" };

function ingestLine(s: B2BSignal): Pick<TermEvent, "tag" | "text"> {
  const hot = s.signalUrgency === "CRITICAL" || s.signalUrgency === "HIGH";
  return {
    tag: hot ? "RADAR" : "INGEST",
    text: `${hot ? "New high-priority lead" : "New lead"}: ${s.companyName} (${SIGNAL_LABELS[s.signalType].toLowerCase()}, found on ${SOURCE_LABELS[s.sourceChannel]}). Fit score ${s.aiOpportunityScore}.`,
  };
}

export function useSignalFeed(filters: Filters) {
  const [allSignals, setAllSignals] = useState<B2BSignal[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pipeline, setPipeline] = useState<PipelineChannel[] | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const apiConfigured = useSyncExternalStore(noopSubscribe, () => streamUrl() !== "", () => true);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<TermEvent[]>([]);

  const aggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSeq = useRef(0);
  const booted = useRef(false);
  const pings = useRef(0);

  const pushEvent = useCallback((tag: TermTag, text: string, ts = Date.now()) => {
    setEvents((prev) => [...prev.slice(-199), { id: ++eventSeq.current, ts, tag, text }]);
  }, []);

  const refreshAggregates = useCallback(() => {
    if (aggTimer.current) clearTimeout(aggTimer.current);
    aggTimer.current = setTimeout(async () => {
      try {
        const [m, a, p] = await Promise.all([getMetrics(), getAnalytics(), getPipeline()]);
        setMetrics(m);
        setAnalytics(a);
        setPipeline(p.channels);
      } catch {
        /* the next event or reload will retry */
      }
    }, 150);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [list, m, a, p, c] = await Promise.all([
        listSignals(NO_FILTERS),
        getMetrics(),
        getAnalytics(),
        getPipeline(),
        getConfig(),
      ]);
      setAllSignals(list);
      setMetrics(m);
      setAnalytics(a);
      setPipeline(p.channels);
      setConfig(c);
      setError(null);

      if (!booted.current) {
        booted.current = true;
        const now = Date.now();
        setEvents([
          { id: ++eventSeq.current, ts: now, tag: "SYS", text: "Lead feed is live (demo data)" },
          {
            id: ++eventSeq.current,
            ts: now,
            tag: "SYS",
            text: c.achrocallMode === "live" ? "AI calling system connected" : "AI calling runs in demo mode; no real calls are placed",
          },
          ...list
            .slice(0, 6)
            .reverse()
            .map((s) => ({ id: ++eventSeq.current, ts: new Date(s.detectedTimestamp).getTime(), ...ingestLine(s) })),
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, []);

  const applySignal = useCallback(
    (s: B2BSignal, opts: { fresh?: boolean } = {}) => {
      setAllSignals((prev) => {
        const i = prev.findIndex((p) => p.id === s.id);
        if (i === -1) return [s, ...prev];
        const next = prev.slice();
        next[i] = s;
        return next;
      });
      if (opts.fresh) {
        setFreshIds((prev) => new Set(prev).add(s.id));
        setTimeout(() => {
          setFreshIds((prev) => {
            const next = new Set(prev);
            next.delete(s.id);
            return next;
          });
        }, 6000);
      }
      refreshAggregates();
    },
    [refreshAggregates],
  );

  // Initial load. Deferred one tick so it never runs state updates synchronously inside the effect
  // (and a strict-mode double mount cancels the first timer instead of fetching twice).
  useEffect(() => {
    const t = setTimeout(() => void reload(), 0);
    return () => clearTimeout(t);
  }, [reload]);

  // Live stream (Server-Sent Events)
  useEffect(() => {
    const url = streamUrl();
    if (!url) return; // backend URL not configured: the feed shows a clear error instead
    const es = new EventSource(url);
    let wasDown = false;
    const seen = new Set<string>(); // dedupe terminal lines for events we also applied locally

    es.onopen = () => {
      setConnection("live");
      if (wasDown) {
        wasDown = false;
        pushEvent("SYS", "Back online. Lead list refreshed");
        void reload();
      }
    };
    es.onerror = () => {
      if (!wasDown) pushEvent("SYS", "Connection lost. Reconnecting…");
      wasDown = true;
      setConnection("reconnecting");
    };

    const parse = (e: Event) => JSON.parse((e as MessageEvent).data) as B2BSignal;

    es.addEventListener("signal.created", (e) => {
      const s = parse(e);
      applySignal(s, { fresh: true });
      if (!seen.has(`c:${s.id}`)) {
        seen.add(`c:${s.id}`);
        const line = ingestLine(s);
        pushEvent(line.tag, line.text);
      }
    });

    es.addEventListener("signal.updated", (e) => {
      const s = parse(e);
      applySignal(s);
      const key = `u:${s.id}:${s.achroCallStatus}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (s.achroCallStatus === "DISPATCHED_TO_ACHROCALL") {
        pushEvent("WEBHOOK", `Call queued: ${s.decisionMaker.name} at ${s.companyName}`);
      } else if (s.achroCallStatus === "CALL_COMPLETED") {
        pushEvent("ACHROCALL", `Call finished: ${s.companyName}. ${s.callLog?.outcome ?? "Result received"}`);
        toast({
          title: `Call completed: ${s.companyName}`,
          description: s.callLog ? `${s.callLog.outcome}. Transcript is ready.` : "Result received.",
          variant: "success",
        });
      }
    });

    es.addEventListener("ping", () => {
      pings.current += 1;
      if (pings.current % 6 === 0) pushEvent("SYS", "Connection healthy");
    });

    return () => {
      es.close();
      if (aggTimer.current) clearTimeout(aggTimer.current);
    };
  }, [applySignal, reload, pushEvent]);

  const signals = useMemo(
    () => allSignals.filter((s) => matchesFilters(s, filters)),
    [allSignals, filters],
  );

  return {
    allSignals,
    signals,
    metrics,
    analytics,
    pipeline,
    config,
    loading,
    error,
    connection: apiConfigured ? connection : ("offline" as Connection),
    freshIds,
    events,
    pushEvent,
    applySignal,
    reload,
  };
}
