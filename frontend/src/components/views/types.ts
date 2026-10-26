import type { TabId } from "@/components/app-shell";
import type { useSignalFeed } from "@/hooks/use-signal-feed";
import type { B2BSignal } from "@/lib/types";

export interface ViewProps {
  feed: ReturnType<typeof useSignalFeed>;
  onPitch: (s: B2BSignal) => void;
  onViewLog: (s: B2BSignal) => void;
  onTelemetry: (s: B2BSignal) => void;
  onOpenPaywall: () => void;
  onTab: (t: TabId) => void;
}
