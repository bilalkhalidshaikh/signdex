export type Industry =
  | "Healthcare & Dental"
  | "Legal Intake"
  | "Automotive Services"
  | "Property Management"
  | "Commercial HVAC";

export type SignalType =
  | "RECEPTIONIST_HIRING_SPIKE"
  | "NEW_LOCATION_OPENED"
  | "SINGLE_PHONE_MULTI_BRANCH"
  | "AUTOMATION_ADOPTION_INTENT";

export type SignalUrgency = "CRITICAL" | "HIGH" | "MEDIUM";

export type AchroCallStatus = "PENDING" | "DISPATCHED_TO_ACHROCALL" | "CALL_COMPLETED";

export interface DecisionMaker {
  name: string;
  title: string;
  email: string;
}

export type SourceChannel =
  | "LINKEDIN_RECRUITING"
  | "INDEED_JOB_BOARD"
  | "GOOGLE_MAPS_MULTI_BRANCH_SCAN"
  | "CRUNCHBASE_EXPANSION_API"
  | "APOLLO_INTENT_FEED";

export const SOURCE_CHANNELS: SourceChannel[] = [
  "LINKEDIN_RECRUITING",
  "INDEED_JOB_BOARD",
  "GOOGLE_MAPS_MULTI_BRANCH_SCAN",
  "CRUNCHBASE_EXPANSION_API",
  "APOLLO_INTENT_FEED",
];

export const SOURCE_LABELS: Record<SourceChannel, string> = {
  LINKEDIN_RECRUITING: "LINKEDIN RECRUITING",
  INDEED_JOB_BOARD: "INDEED JOB BOARD",
  GOOGLE_MAPS_MULTI_BRANCH_SCAN: "GOOGLE MAPS MULTI-BRANCH SCAN",
  CRUNCHBASE_EXPANSION_API: "CRUNCHBASE EXPANSION API",
  APOLLO_INTENT_FEED: "APOLLO INTENT FEED",
};

export const PROVIDER_NAMES: Record<SourceChannel, string> = {
  LINKEDIN_RECRUITING: "LinkedIn",
  INDEED_JOB_BOARD: "Indeed",
  GOOGLE_MAPS_MULTI_BRANCH_SCAN: "Google Maps",
  CRUNCHBASE_EXPANSION_API: "Crunchbase",
  APOLLO_INTENT_FEED: "Apollo",
};

export interface TelemetryItem {
  label: string;
  value: string;
}

export interface PipelineChannel {
  channel: SourceChannel;
  providerMode: "SANDBOX" | "LIVE";
  signals24h: number;
  lastSignalAt: string | null;
  liveApi: "AWAITING_CLIENT_API_KEY" | "CONNECTED";
}

export interface AppConfig {
  version: string;
  achrocallMode: "sandbox" | "live";
  achrocallWebhookConfigured: boolean;
  callbackPath: string;
  callbackSecretRequired: boolean;
  sandboxAutoComplete: boolean;
  sandboxCallSeconds: number[];
  database: string;
  arrPerLocation: number;
  reseedIfStaleHours: number;
  vapiLiveConfigured: boolean;
}

export interface CallLog {
  outcome: string;
  summary: string;
  durationSeconds: number;
  transcript: { speaker: "agent" | "prospect"; text: string }[];
  completedAt: string;
}

export interface B2BSignal {
  id: string;
  companyName: string;
  industry: Industry;
  locationsCount: number;
  signalType: SignalType;
  signalUrgency: SignalUrgency;
  contactPhone: string;
  decisionMaker: DecisionMaker;
  aiOpportunityScore: number;
  achroCallStatus: AchroCallStatus;
  revenueEstimate: string;
  detectedTimestamp: string;
  signalDetail: string;
  source: string;
  achroCallReference: string | null;
  dispatchedAt: string | null;
  callLog: CallLog | null;
  sourceChannel: SourceChannel;
  sourceTelemetry: TelemetryItem[];
}

export interface Metrics {
  totalSignalsToday: number;
  highUrgencyTargets: number;
  dispatchedToAchrocall: number;
  estimatedPipelineArr: number;
  arrPerLocation: number;
  windowHours: number;
}

export interface Analytics {
  signalTypeDistribution: { signalType: SignalType; count: number }[];
  readinessByIndustry: { industry: Industry; avgScore: number; signals: number; readyCount: number }[];
}

export interface DispatchResponse {
  mode: "live" | "sandbox";
  reference: string;
  message: string;
  payload: Record<string, unknown>;
  signal: B2BSignal;
}

export interface PitchTurn {
  speaker: "agent" | "prospect";
  text: string;
  pauseMs: number;
}

export interface VapiSession {
  sessionId: string;
  mode: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  turns: PitchTurn[];
  liveConfigAvailable: boolean;
  note: string;
}

export interface Filters {
  signalType: SignalType | "ALL";
  industry: Industry | "ALL";
  urgency: SignalUrgency | "ALL";
}

export const INDUSTRIES: Industry[] = [
  "Healthcare & Dental",
  "Legal Intake",
  "Automotive Services",
  "Property Management",
  "Commercial HVAC",
];

export const SIGNAL_TYPES: SignalType[] = [
  "RECEPTIONIST_HIRING_SPIKE",
  "NEW_LOCATION_OPENED",
  "SINGLE_PHONE_MULTI_BRANCH",
  "AUTOMATION_ADOPTION_INTENT",
];

export const SIGNAL_LABELS: Record<SignalType, string> = {
  RECEPTIONIST_HIRING_SPIKE: "Receptionist Hiring Spike",
  NEW_LOCATION_OPENED: "New Location Opened",
  SINGLE_PHONE_MULTI_BRANCH: "Single Phone, Multi-Branch",
  AUTOMATION_ADOPTION_INTENT: "Automation Adoption Intent",
};

export const URGENCIES: SignalUrgency[] = ["CRITICAL", "HIGH", "MEDIUM"];
