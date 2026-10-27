"use client";

import { Mic, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { ViewProps } from "./types";

export function VoiceView({ feed, onPitch, onViewLog }: ViewProps) {
  const calls = feed.allSignals.filter((s) => s.achroCallStatus !== "PENDING");
  const inFlight = calls.filter((s) => s.achroCallStatus === "DISPATCHED_TO_ACHROCALL");
  const done = calls.filter((s) => s.achroCallStatus === "CALL_COMPLETED");
  const booked = done.filter((s) => s.callLog?.outcome === "Demo Booked").length;
  const timed = done.filter((s) => (s.callLog?.durationSeconds ?? 0) > 0);
  const avg = timed.length ? Math.round(timed.reduce((n, s) => n + (s.callLog?.durationSeconds ?? 0), 0) / timed.length) : 0;

  const stats = [
    ["Calling now", String(inFlight.length)],
    ["Calls completed", String(done.length)],
    ["Demos booked", String(booked)],
    ["Average call length", avg ? `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, "0")}` : "—"],
  ];

  return (
    <>
      <PageHeader
        title="AI Calling System"
        subtitle="Outbound AI calls to your leads, with a transcript for each one. In demo mode the calls and transcripts are simulated."
        connection={feed.connection}
      />

      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="panel p-6">
            <p className="text-sm font-medium text-slate-500">{l}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{v}</p>
          </div>
        ))}
      </div>

      <section className="panel overflow-x-auto p-6">
        <h2 className="mb-5 text-base font-semibold tracking-tight text-slate-900">Outbound Call Queue</h2>
        {calls.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No calls yet. Choose &lsquo;Dispatch Call&rsquo; on a lead in Lead Radar and it will show up here.
          </p>
        ) : (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                {["Company", "Contact", "Status", "Outcome", ""].map((h) => (
                  <th key={h} className="pb-3 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-900">{s.companyName}</td>
                  <td className="py-3 pr-4 text-slate-600">{s.decisionMaker.name}</td>
                  <td className="py-3 pr-4 text-xs">
                    {s.achroCallStatus === "CALL_COMPLETED" ? (
                      <span className="text-emerald-600">Completed</span>
                    ) : (
                      <span className="text-amber-600">In call queue…</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{s.callLog?.outcome ?? "—"}</td>
                  <td className="space-x-2 py-3 text-right">
                    {s.callLog && (
                      <button type="button" onClick={() => onViewLog(s)} className="btn btn-ghost py-1.5">
                        <ScrollText className="h-4 w-4" /> View Transcript
                      </button>
                    )}
                    <button type="button" onClick={() => onPitch(s)} className="btn btn-ghost py-1.5">
                      <Mic className="h-4 w-4" /> Preview AI Call
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
