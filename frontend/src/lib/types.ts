export type Industry =
  | "Healthcare & Dental"
  | "Legal Intake"
  | "Automotive Services"
  | "Property Management"
  | "Commercial HVAC"
  | "Roofing & Exteriors"
  | "Plumbing & Electrical";

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
  LINKEDIN_RECRUITING: "LinkedIn job posts",
  INDEED_JOB_BOARD: "Indeed job posts",
  GOOGLE_MAPS_MULTI_BRANCH_SCAN: "Google Maps listings",
  CRUNCHBASE_EXPANSION_API: "Crunchbase company news",
  APOLLO_INTENT_FEED: "Apollo buyer interest",
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
  state: string | null;
  city: string | null;
}

/** Server-side reading of a free-text search ("Roofing companies in FL"). */
export interface ParsedQuery {
  query: string;
  industry: Industry | null;
  state: string | null;
  stateName: string | null;
  city: string | null;
  signalType: SignalType | null;
  keywords: string[];
  recognized: boolean;
}

export interface SimulateResponse {
  signals: B2BSignal[];
  matched: ParsedQuery;
  note: string | null;
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
  "Roofing & Exteriors",
  "Plumbing & Electrical",
];

export const SIGNAL_TYPES: SignalType[] = [
  "RECEPTIONIST_HIRING_SPIKE",
  "NEW_LOCATION_OPENED",
  "SINGLE_PHONE_MULTI_BRANCH",
  "AUTOMATION_ADOPTION_INTENT",
];

export const SIGNAL_LABELS: Record<SignalType, string> = {
  RECEPTIONIST_HIRING_SPIKE: "Hiring receptionists",
  NEW_LOCATION_OPENED: "Opened a new location",
  SINGLE_PHONE_MULTI_BRANCH: "One phone line, many locations",
  AUTOMATION_ADOPTION_INTENT: "Researching automation tools",
};

/** Plain-language call status shown on cards, tables and reports. */
export const CALL_STATUS_LABELS: Record<AchroCallStatus, string> = {
  PENDING: "Not called yet",
  DISPATCHED_TO_ACHROCALL: "In call queue",
  CALL_COMPLETED: "Called",
};

/** Friendlier names for the detail rows the backend attaches to each lead (older leads used the technical names). */
export const SOURCE_DETAIL_LABELS: Record<string, string> = {
  Query: "Search used",
  "Postings matched": "Job posts found",
  "Active listings": "Open job posts",
  "Match confidence": "Match strength",
  "Scan region": "Region",
  "Branches clustered": "Locations found",
  "Shared phone lines": "Shared phone lines",
  "Geo cluster": "Region",
  Event: "What happened",
  "Locations after event": "Locations now",
  "HQ region": "Region",
  "Intent topic": "Topic",
  "Intent surge": "Interest vs. usual",
  "Account region": "Region",
};

export const URGENCIES: SignalUrgency[] = ["CRITICAL", "HIGH", "MEDIUM"];
