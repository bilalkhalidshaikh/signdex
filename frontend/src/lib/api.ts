import type {
  AppConfig,
  PipelineChannel,
  Analytics,
  B2BSignal,
  DispatchResponse,
  Filters,
  Industry,
  Metrics,
  ParsedQuery,
  SimulateResponse,
  VapiSession,
} from "./types";

const ENV_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");

/**
 * Backend base URL. NEXT_PUBLIC_API_URL is inlined at build time (set it in the Vercel project settings).
 * The localhost fallback only applies when this page itself is served from localhost, so a production
 * deployment with the variable missing fails loudly instead of calling a localhost it can never reach.
 */
export function getApiUrl(): string {
  if (ENV_API_URL) return ENV_API_URL;
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://localhost:8000";
  return "";
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiUrl();
  if (!base) {
    throw new ApiError("This app isn't connected to its server yet. An administrator needs to set the server address (NEXT_PUBLIC_API_URL) and redeploy.", 0);
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    const mixed = typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http:");
    throw new ApiError(
      mixed
        ? `The browser blocked the connection: this page is secure (https) but the server address (${base}) is not. The server needs an https address.`
        : `Can't reach the server at ${base}. Check that it's running and that it allows this website.`,
      0,
    );
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export function listSignals(filters: Filters): Promise<B2BSignal[]> {
  const q = new URLSearchParams({ limit: "200" });
  if (filters.signalType !== "ALL") q.set("signalType", filters.signalType);
  if (filters.industry !== "ALL") q.set("industry", filters.industry);
  if (filters.urgency !== "ALL") q.set("urgency", filters.urgency);
  return request(`/api/b2b-signals?${q}`);
}

export const getPipeline = () => request<{ channels: PipelineChannel[]; streamClients: number }>("/api/pipeline/health");
export const getConfig = () => request<AppConfig>("/api/config");
export const getPayloadPreview = (signalId: string) =>
  request<Record<string, unknown>>(`/api/b2b-signals/${signalId}/achrocall-payload`);

export const getMetrics =() => request<Metrics>("/api/b2b-signals/metrics");
export const getAnalytics = () => request<Analytics>("/api/b2b-signals/analytics");

export interface SimulateOptions {
  query?: string;
  industry?: Industry | null;
  state?: string | null;
  count?: number;
}

/** Generates signals; with a `query` they match it (industry / state / city / name), see backend queryparse.py. */
export const simulateSignals = (opts: SimulateOptions = {}) =>
  request<SimulateResponse>("/api/b2b-signals/simulate", {
    method: "POST",
    body: JSON.stringify({
      query: opts.query || undefined,
      industry: opts.industry ?? undefined,
      state: opts.state ?? undefined,
      count: opts.count ?? 1,
    }),
  });

export const parseQuery = (q: string) =>
  request<ParsedQuery>(`/api/b2b-signals/parse?q=${encodeURIComponent(q)}`);

export const dispatchToAchroCall = (signalId: string) =>
  request<DispatchResponse>("/api/achrocall/dispatch", {
    method: "POST",
    body: JSON.stringify({ signalId }),
  });

export const triggerPitchCall = (signalId: string) =>
  request<VapiSession>("/api/vapi/trigger-call", {
    method: "POST",
    body: JSON.stringify({ signalId }),
  });

export const exportProfile = (signalId: string) =>
  request<Record<string, unknown>>(`/api/b2b-signals/${signalId}/export`);

export const streamUrl = () => {
  const base = getApiUrl();
  return base ? `${base}/api/b2b-signals/stream` : "";
};
