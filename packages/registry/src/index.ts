/**
 * @agent-oss/registry
 *
 * Agent registry client for registering and discovering agents.
 * Backed by Supabase for persistence and real-time updates.
 */

// Export all types
export type {
  AgentStatus,
  CreditEventType,
  ViolationSeverity,
  GuardianRegistration,
  Guardian,
  AgentRegistration,
  Agent,
  CreditEvent,
  CreditLedgerEntry,
  VerifyResult,
  RegistryClientOptions,
  GuardianRow,
  AgentRow,
  CreditLedgerRow,
} from './types.js';

// Export the main client class
export { RegistryClient } from './client.js';

// Export individual operation modules for advanced usage
export * as agents from './agents.js';
export * as guardians from './guardians.js';
export * as credits from './credits.js';
export * as verify from './verify.js';
