import type {
  AppConfig,
  PipelineChannel,
  Analytics,
  B2BSignal,
  DispatchResponse,
  Filters,
  Metrics,
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
    throw new ApiError("The backend URL is not configured. Set NEXT_PUBLIC_API_URL to your deployed API (https) and redeploy.", 0);
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
        ? `Blocked: this page is HTTPS but the API (${base}) is HTTP. Serve the backend over HTTPS.`
        : `Cannot reach the API at ${base}. Is the backend running, and does its CORS_ORIGINS include this site?`,
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

export const simulateSignal = () =>
  request<B2BSignal>("/api/b2b-signals/simulate", { method: "POST", body: "{}" });

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
