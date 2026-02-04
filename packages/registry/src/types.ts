/**
 * @agent-oss/registry - Type Definitions
 * TypeScript interfaces matching the database schema
 */

export type AgentStatus = 'active' | 'suspended' | 'revoked';

export type CreditEventType =
  | 'registration'
  | 'pr_merged'
  | 'pr_rejected'
  | 'test_failure'
  | 'security_issue'
  | 'manual_adjustment';

export type ViolationSeverity = 'minor' | 'moderate' | 'severe';

/**
 * Guardian registration input
 */
export interface GuardianRegistration {
  githubId: string;
  email: string;
  agreedToTermsAt: string;
  publicKey?: string;
}

/**
 * Guardian entity (persisted)
 */
export interface Guardian extends GuardianRegistration {
  id: string;
  agentCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent registration input
 */
export interface AgentRegistration {
  did: string;
  publicKey: string;
  name: string;
  description?: string;
  guardianGithubId: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
  didDocument: object;
}

/**
 * Agent entity (persisted)
 */
export interface Agent {
  id: string;
  did: string;
  publicKey: string;
  name: string;
  description?: string;
  guardianId: string;
  status: AgentStatus;
  credits: number;
  trustScore: number;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
  didDocument: object;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
  revocationReason?: string;
}

/**
 * Credit event input
 */
export interface CreditEvent {
  type: CreditEventType;
  amount: number;
  reason: string;
  prUrl?: string;
}

/**
 * Credit ledger entry (persisted)
 */
export interface CreditLedgerEntry extends CreditEvent {
  id: string;
  agentId: string;
  balanceAfter: number;
  createdAt: string;
}

/**
 * Verification result
 */
export interface VerifyResult {
  valid: boolean;
  agent?: Agent;
  error?: string;
}

/**
 * Registry client configuration
 */
export interface RegistryClientOptions {
  supabaseUrl: string;
  supabaseKey: string; // service role key for full access
}

/**
 * Database row types (snake_case from Supabase)
 */
export interface GuardianRow {
  id: string;
  github_id: string;
  email: string;
  agreed_to_terms_at: string;
  public_key?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRow {
  id: string;
  did: string;
  public_key: string;
  name: string;
  description?: string;
  guardian_id: string;
  status: AgentStatus;
  credits: number;
  trust_score: number;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
  did_document: object;
  created_at: string;
  updated_at: string;
  revoked_at?: string;
  revocation_reason?: string;
}

export interface CreditLedgerRow {
  id: string;
  agent_id: string;
  type: CreditEventType;
  amount: number;
  balance_after: number;
  reason: string;
  pr_url?: string;
  created_at: string;
}
