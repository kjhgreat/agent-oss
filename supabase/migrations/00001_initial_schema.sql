-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM types
CREATE TYPE agent_status AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE credit_event_type AS ENUM (
  'registration', 'pr_merged', 'pr_rejected',
  'test_failure', 'security_issue', 'manual_adjustment'
);
CREATE TYPE violation_severity AS ENUM ('minor', 'moderate', 'severe');

-- Guardians table (human maintainers)
CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id VARCHAR(39) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  public_key TEXT,
  agreed_to_terms_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  did VARCHAR(500) UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  guardian_id UUID NOT NULL REFERENCES guardians(id),
  status agent_status DEFAULT 'active',
  credits INTEGER DEFAULT 100,
  trust_score DECIMAL(5,2) DEFAULT 50.00,
  capabilities TEXT[],
  metadata JSONB DEFAULT '{}',
  did_document JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  CONSTRAINT credits_non_negative CHECK (credits >= 0),
  CONSTRAINT trust_score_range CHECK (trust_score >= 0 AND trust_score <= 100)
);

-- Credit ledger (immutable audit log)
CREATE TABLE credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  event_type credit_event_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  pr_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Violations table
CREATE TABLE violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  severity violation_severity NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB,
  guardian_notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signature cache (replay attack prevention)
CREATE TABLE signature_cache (
  signature_hash VARCHAR(64) PRIMARY KEY,
  agent_did VARCHAR(500) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_guardian ON agents(guardian_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_did ON agents(did);
CREATE INDEX idx_credit_ledger_agent ON credit_ledger(agent_id);
CREATE INDEX idx_credit_ledger_created ON credit_ledger(created_at);
CREATE INDEX idx_violations_agent ON violations(agent_id);
CREATE INDEX idx_violations_unresolved ON violations(agent_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_signature_cache_created ON signature_cache(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER guardians_updated_at
  BEFORE UPDATE ON guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_cache ENABLE ROW LEVEL SECURITY;

-- Public read for agents (DIDs are public)
CREATE POLICY "Agents are publicly readable"
  ON agents FOR SELECT USING (true);

-- Service role full access policies
CREATE POLICY "Service role full access to agents"
  ON agents FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to guardians"
  ON guardians FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to credit_ledger"
  ON credit_ledger FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to violations"
  ON violations FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to signature_cache"
  ON signature_cache FOR ALL USING (auth.role() = 'service_role');

-- Function to clean old signature cache entries (call periodically)
CREATE OR REPLACE FUNCTION cleanup_signature_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM signature_cache
  WHERE created_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
