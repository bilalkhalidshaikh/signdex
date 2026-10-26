"use client";

import { X } from "lucide-react";
import { useSyncExternalStore } from "react";

const KEY = "radar.sandboxNotice.dismissed";

// Tiny external store so the banner reads sessionStorage without setState-in-effect or a hydration mismatch.
const listeners = new Set<() => void>();
let dismissedInMemory = false; // fallback when storage is unavailable (private mode, blocked cookies)

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function isDismissed() {
  if (dismissedInMemory) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function dismiss() {
  dismissedInMemory = true;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* in-memory flag still hides it for this page view */
  }
  listeners.forEach((l) => l());
}

export function NoticeBanner({ onLearnMore }: { onLearnMore: () => void }) {
  const hidden = useSyncExternalStore(subscribe, isDismissed, () => false);

  if (hidden) return null;

  return (
    <div role="region" aria-label="Sandbox environment notice" className="border-b border-amber-200/70 bg-amber-50">
      <div className="flex items-start gap-3 px-4 py-3 sm:px-8">
        <p className="flex-1 text-sm leading-relaxed text-amber-900/80">
          <span className="font-semibold text-amber-950">🟢 Demo Environment Active (Sandbox Ingestion).</span> Live Provider APIs
          (LinkedIn, Apollo, BrightData, AchroCall Production Endpoints) are provisioned on client commitment. Production feeds incur
          active proxy &amp; credit consumption fees.{" "}
          <button
            type="button"
            onClick={onLearnMore}
            className="font-semibold text-amber-950 underline underline-offset-4 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Learn more
          </button>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss sandbox notice"
          className="shrink-0 rounded-lg p-1 text-amber-700 transition hover:bg-amber-100 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
