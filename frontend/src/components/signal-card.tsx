"use client";

import {
  Building2,
  Car,
  Check,
  FileJson,
  Hammer,
  HeartPulse,
  Loader2,
  Mail,
  Mic,
  Phone,
  Radar,
  Scale,
  ScrollText,
  Send,
  Thermometer,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { dispatchToAchroCall, exportProfile } from "@/lib/api";
import { copyText, toast } from "@/lib/toast";
import { CALL_STATUS_LABELS, PROVIDER_NAMES, SIGNAL_LABELS, SOURCE_LABELS, type B2BSignal, type Industry, type SignalUrgency } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const INDUSTRY_ICONS: Record<Industry, LucideIcon> = {
  "Healthcare & Dental": HeartPulse,
  "Legal Intake": Scale,
  "Automotive Services": Car,
  "Property Management": Building2,
  "Commercial HVAC": Thermometer,
  "Roofing & Exteriors": Hammer,
  "Plumbing & Electrical": Wrench,
};

const URGENCY_STYLES: Record<SignalUrgency, string> = {
  CRITICAL: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70",
  HIGH: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70",
  MEDIUM: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const color = score >= 90 ? "#059669" : score >= 80 ? "#4F46E5" : "#94a3b8";
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" role="img" aria-label={`Fit score ${score} out of 100`}>
      <div className="relative h-10 w-10 sm:h-12 sm:w-12">
        <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
          <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-slate-900 sm:text-sm">{score}</span>
      </div>
      <span className="hidden text-[11px] text-slate-500 sm:block">Fit score</span>
    </div>
  );
}

function IconCopy({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    if (await copyText(value)) {
      setDone(true);
      toast({ title: `${label} copied`, description: value, variant: "success" });
      setTimeout(() => setDone(false), 1500);
    } else {
      toast({ title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "error" });
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label.toLowerCase()}: ${value}`}
      title={`Copy ${label.toLowerCase()}`}
      className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-8 sm:w-8"
    >
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Icon className="h-4 w-4" />}
    </button>
  );
}

interface Props {
  signal: B2BSignal;
  now: number;
  fresh: boolean;
  onUpdated: (s: B2BSignal) => void;
  onPitch: (s: B2BSignal) => void;
  onViewLog: (s: B2BSignal) => void;
  onTelemetry: (s: B2BSignal) => void;
}

export function SignalCard({ signal: s, now, fresh, onUpdated, onPitch, onViewLog, onTelemetry }: Props) {
  const [dispatching, setDispatching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const IndustryIcon = INDUSTRY_ICONS[s.industry];
  const synced = s.achroCallStatus !== "PENDING";

  async function dispatch() {
    setDispatching(true);
    try {
      const res = await dispatchToAchroCall(s.id);
      onUpdated(res.signal);
      toast({
        title: res.mode === "live" ? "Call queued" : "Call queued (demo mode)",
        description: res.message,
        variant: "success",
      });
    } catch (e) {
      toast({ title: "Couldn't queue the call", description: e instanceof Error ? e.message : "Please try again.", variant: "error" });
    } finally {
      setDispatching(false);
    }
  }

  async function exportPayload() {
    setExporting(true);
    try {
      const ok = await copyText(JSON.stringify(await exportProfile(s.id), null, 2));
      toast(
        ok
          ? { title: "Lead details copied", description: `${s.companyName} is ready to paste into your CRM.`, variant: "success" }
          : { title: "Couldn't copy", description: "Your browser blocked clipboard access.", variant: "error" },
      );
    } catch (e) {
      toast({ title: "Couldn't export this lead", description: e instanceof Error ? e.message : "Please try again.", variant: "error" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <article className={cn("panel flex min-w-0 flex-col p-5 transition hover:shadow-card-hover sm:p-6", fresh && "animate-fresh border-emerald-300")}>
      {/* Top: company, badges, AI fit */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900" title={s.companyName}>
            {s.companyName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 sm:px-2.5 sm:py-1">
              <IndustryIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {s.industry}
            </span>
            {/* The source pill opens the telemetry modal (on phones this replaces the separate link). */}
            <button
              type="button"
              onClick={() => onTelemetry(s)}
              title={`Found on ${SOURCE_LABELS[s.sourceChannel]}. Tap to see how we found this lead.`}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-2.5 sm:py-1"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden />
              {PROVIDER_NAMES[s.sourceChannel]}
            </button>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium sm:px-2.5 sm:py-1", URGENCY_STYLES[s.signalUrgency])}>
              {s.signalUrgency[0] + s.signalUrgency.slice(1).toLowerCase()}
            </span>
          </div>
        </div>
        <ScoreRing score={s.aiOpportunityScore} />
      </div>

      {/* Middle: firmographics + signal context */}
      <div className="mt-3 sm:mt-5">
        <p className="text-sm font-medium text-slate-800">
          {s.city && s.state && <>{s.city}, {s.state} • </>}
          {s.locationsCount} {s.locationsCount === 1 ? "location" : "locations"} • {s.revenueEstimate.replace(" ARR", "")} revenue
        </p>
        <p className="mt-1.5 text-xs font-medium text-indigo-600 sm:mt-3">
          {SIGNAL_LABELS[s.signalType]} <span className="text-slate-300">·</span> <span className="font-normal text-slate-500">{timeAgo(s.detectedTimestamp, now)}</span>
        </p>
        {/* Longer context stays on tablet/desktop; phones keep the card short and open details via the source pill. */}
        <p className="mt-1 hidden text-sm leading-relaxed text-slate-600 sm:block">{s.signalDetail}</p>
        <button
          type="button"
          onClick={() => onTelemetry(s)}
          className="mt-3 hidden items-center gap-1.5 rounded-lg text-xs font-medium text-slate-500 transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:inline-flex"
        >
          <Radar className="h-3.5 w-3.5" aria-hidden />
          How we found this lead
        </button>
      </div>

      {/* Bottom: decision-maker snapshot */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 sm:mt-5 sm:p-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/70 sm:h-10 sm:w-10" aria-hidden>
          {initials(s.decisionMaker.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {s.decisionMaker.name} <span className="font-normal text-slate-400">•</span> <span className="font-normal text-slate-500">{s.decisionMaker.title}</span>
          </p>
          {/* Email/phone text is hidden on phones (the copy buttons carry the same values). */}
          <p className="hidden truncate text-xs text-slate-500 sm:block">{s.decisionMaker.email}</p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{s.contactPhone}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <IconCopy icon={Mail} value={s.decisionMaker.email} label="Email" />
          <IconCopy icon={Phone} value={s.contactPhone} label="Phone number" />
        </div>
      </div>

      {/* Footer: status + actions */}
      <div className="mt-auto flex flex-col gap-3 pt-4 sm:gap-4 sm:pt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {s.achroCallStatus === "PENDING" && <span className="text-slate-500">{CALL_STATUS_LABELS.PENDING}</span>}
          {s.achroCallStatus !== "PENDING" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
              <Check className="h-3 w-3" aria-hidden />
              {s.achroCallStatus === "CALL_COMPLETED" ? CALL_STATUS_LABELS.CALL_COMPLETED : CALL_STATUS_LABELS.DISPATCHED_TO_ACHROCALL}
            </span>
          )}
          {s.achroCallStatus === "DISPATCHED_TO_ACHROCALL" && (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-700" role="status">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Call in progress…
            </span>
          )}
          {s.achroCallStatus === "CALL_COMPLETED" && s.callLog && (
            <button
              type="button"
              onClick={() => onViewLog(s)}
              className="inline-flex items-center gap-1.5 rounded-md font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <ScrollText className="h-3.5 w-3.5" aria-hidden />
              {s.callLog.outcome} · View transcript
            </button>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={dispatch}
            disabled={synced || dispatching}
            className={cn("btn col-span-2 sm:col-span-1", synced ? "btn-ghost" : "btn-primary")}
          >
            {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : synced ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {synced ? "Call Queued" : "Dispatch Call"}
          </button>
          <button type="button" onClick={() => onPitch(s)} className="btn btn-ghost">
            <Mic className="h-4 w-4" />
            Preview AI Call
          </button>
          <button
            type="button"
            onClick={exportPayload}
            disabled={exporting}
            aria-label="Export lead to your CRM"
            title="Export lead to your CRM"
            className="btn btn-ghost min-w-11 px-2.5 sm:ml-auto"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
