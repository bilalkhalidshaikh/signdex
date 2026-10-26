-- PostgreSQL reference schema for the B2B Operational Trigger Intelligence model.
-- The API creates this table automatically on startup (SQLAlchemy create_all);
-- this file is for DBAs / migrations.

CREATE TABLE IF NOT EXISTS b2b_signals (
    id                   VARCHAR(36)  PRIMARY KEY,
    company_name         VARCHAR(200) NOT NULL,
    industry             VARCHAR(64)  NOT NULL CHECK (industry IN (
        'Healthcare & Dental', 'Legal Intake', 'Automotive Services',
        'Property Management', 'Commercial HVAC')),
    locations_count      INTEGER      NOT NULL CHECK (locations_count >= 1),
    signal_type          VARCHAR(48)  NOT NULL CHECK (signal_type IN (
        'RECEPTIONIST_HIRING_SPIKE', 'NEW_LOCATION_OPENED',
        'SINGLE_PHONE_MULTI_BRANCH', 'AUTOMATION_ADOPTION_INTENT')),
    signal_urgency       VARCHAR(16)  NOT NULL CHECK (signal_urgency IN ('CRITICAL', 'HIGH', 'MEDIUM')),
    contact_phone        VARCHAR(32)  NOT NULL,
    decision_maker       JSON         NOT NULL,  -- { name, title, email }
    ai_opportunity_score INTEGER      NOT NULL CHECK (ai_opportunity_score BETWEEN 0 AND 100),
    achrocall_status     VARCHAR(32)  NOT NULL DEFAULT 'PENDING' CHECK (achrocall_status IN (
        'PENDING', 'DISPATCHED_TO_ACHROCALL', 'CALL_COMPLETED')),
    revenue_estimate     VARCHAR(64)  NOT NULL,
    detected_timestamp   TIMESTAMPTZ  NOT NULL,
    signal_detail        TEXT         NOT NULL DEFAULT '',
    source               VARCHAR(16)  NOT NULL DEFAULT 'simulated',
    achrocall_reference  VARCHAR(64),
    dispatched_at        TIMESTAMPTZ,
    call_log             JSON,  -- { outcome, summary, durationSeconds, transcript[], completedAt }
    source_channel       VARCHAR(48),  -- LINKEDIN_RECRUITING | INDEED_JOB_BOARD | GOOGLE_MAPS_MULTI_BRANCH_SCAN | CRUNCHBASE_EXPANSION_API | APOLLO_INTENT_FEED
    source_telemetry     JSON   -- [{ label, value }] matching evidence from the source channel
);

CREATE INDEX IF NOT EXISTS ix_b2b_signals_detected ON b2b_signals (detected_timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_b2b_signals_filter   ON b2b_signals (signal_type, industry, signal_urgency);
