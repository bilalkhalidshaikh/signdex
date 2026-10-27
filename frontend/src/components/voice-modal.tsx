"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Bot, Loader2, PhoneOff, RotateCcw, User, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { triggerPitchCall } from "@/lib/api";
import { cancelSpeech, speak, speechSupported } from "@/lib/speech";
import type { B2BSignal, VapiSession } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "connecting" | "live" | "ended" | "error";
interface Line {
  speaker: "agent" | "prospect";
  text: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const noopSubscribe = () => () => {};

function Waveform({ active, tone }: { active: boolean; tone: string }) {
  return (
    <div className="flex h-8 items-center gap-1" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className={cn("h-full w-1 origin-center rounded-full transition-opacity", tone, active ? "animate-bar opacity-100" : "scale-y-[0.2] opacity-40")}
          style={active ? { animationDelay: `${(i % 7) * 90}ms` } : undefined}
        />
      ))}
    </div>
  );
}

interface SessionProps {
  signal: B2BSignal;
  onClose: () => void;
  onReplay: () => void;
}

/** One call. Mounted with a fresh key per start/replay, so all state resets by remounting. */
function VoiceSession({ signal, onClose, onReplay }: SessionProps) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [session, setSession] = useState<VapiSession | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [speaker, setSpeaker] = useState<Line["speaker"] | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canSpeak = useSyncExternalStore(noopSubscribe, speechSupported, () => false);
  const [sound, setSound] = useState(true);
  const soundOn = sound && canSpeak;
  const soundRef = useRef(soundOn);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    soundRef.current = soundOn;
    if (!soundOn) cancelSpeech();
  }, [soundOn]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const s = await triggerPitchCall(signal.id);
        if (cancelled) return;
        setSession(s);
        await sleep(1000);
        if (cancelled) return;
        setPhase("live");

        for (const turn of s.turns) {
          await sleep(turn.pauseMs);
          if (cancelled) return;
          setSpeaker(turn.speaker);
          setLines((prev) => [...prev, { speaker: turn.speaker, text: "" }]);
          const words = turn.text.split(" ");
          // Voice and transcript run together; the turn ends when both finish.
          const spoken = soundRef.current ? speak(turn.text, turn.speaker) : Promise.resolve();
          const typed = (async () => {
            for (let i = 1; i <= words.length; i++) {
              if (cancelled) return;
              const partial = words.slice(0, i).join(" ");
              setLines((prev) => prev.map((l, idx) => (idx === prev.length - 1 ? { ...l, text: partial } : l)));
              await sleep(soundRef.current ? 280 : turn.speaker === "agent" ? 170 : 130);
            }
          })();
          await Promise.all([typed, spoken]);
          if (cancelled) return;
        }
        setSpeaker(null);
        setPhase("ended");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not start the demo call");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      cancelSpeech();
    };
  }, [signal.id]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float focus:outline-none">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="min-w-0">
          <Dialog.Title className="truncate text-lg font-semibold text-slate-900">Sample AI Call — {signal.companyName}</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-slate-500">
            How the AI would open a call with {signal.decisionMaker.name}, {signal.decisionMaker.title}
          </Dialog.Description>
        </div>
        <Dialog.Close aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
          <X className="h-5 w-5" />
        </Dialog.Close>
      </div>

      <div className="flex items-center justify-between gap-4 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", speaker === "agent" ? "bg-achrocall/20 text-achrocall" : "bg-white text-slate-500 ring-1 ring-slate-200")}>
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Ava · AI caller</p>
            <p className="text-xs text-slate-500">
              {phase === "connecting" && "Connecting…"}
              {phase === "live" && (speaker === "agent" ? "Speaking" : speaker === "prospect" ? "Listening" : "Connected")}
              {phase === "ended" && "Call ended"}
              {phase === "error" && "Failed to connect"}
            </p>
          </div>
        </div>
        <Waveform active={phase === "live" && speaker !== null} tone={speaker === "prospect" ? "bg-brand-soft" : "bg-achrocall"} />
        {canSpeak && (
          <button
            type="button"
            onClick={() => setSound((v) => !v)}
            aria-pressed={sound}
            aria-label={sound ? "Mute the call" : "Unmute the call"}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        )}
        <div className="text-right">
          <p className="font-mono text-sm tabular-nums text-slate-900">
            {mm}:{ss}
          </p>
          <p className="text-xs text-slate-500">{phase === "live" ? "LIVE" : phase === "ended" ? "DONE" : "—"}</p>
        </div>
      </div>

      <div className="min-h-[16rem] flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
        {phase === "connecting" && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Starting the sample call…
          </div>
        )}
        {phase === "error" && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {lines.map((l, i) => (
          <div key={i} className={cn("flex gap-2.5", l.speaker === "prospect" && "flex-row-reverse")}>
            <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", l.speaker === "agent" ? "bg-achrocall/15 text-achrocall" : "bg-brand/15 text-indigo-600")}>
              {l.speaker === "agent" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            </div>
            <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed", l.speaker === "agent" ? "rounded-tl-sm bg-slate-100 text-slate-800" : "rounded-tr-sm bg-indigo-50 text-slate-800")}>
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {l.speaker === "agent" ? "Ava (AI)" : `${signal.decisionMaker.name.split(" ")[0]} (demo)`}
              </p>
              {l.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {session?.note ?? "Demo call. No real call is placed."}
          {soundOn ? " The voice plays through your device." : ""}
        </p>
        <div className="flex gap-2">
          {(phase === "ended" || phase === "error") && (
            <button type="button" onClick={onReplay} className="btn btn-ghost">
              <RotateCcw className="h-4 w-4" /> Replay
            </button>
          )}
          <button type="button" onClick={onClose} className="btn whitespace-nowrap bg-rose-600 text-white hover:bg-rose-500">
            <PhoneOff className="h-4 w-4" /> {phase === "live" || phase === "connecting" ? "End Call" : "Close"}
          </button>
        </div>
      </div>
    </Dialog.Content>
  );
}

export function VoiceModal({ signal, onClose }: { signal: B2BSignal | null; onClose: () => void }) {
  const [runKey, setRunKey] = useState(0);
  return (
    <Dialog.Root open={signal !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
        {signal && <VoiceSession key={`${signal.id}:${runKey}`} signal={signal} onClose={onClose} onReplay={() => setRunKey((k) => k + 1)} />}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
