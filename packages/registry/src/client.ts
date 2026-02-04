/**
 * @antfarm/registry - Registry Client
 * Main client class for interacting with the agent registry
 */

import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import type {
  Agent,
  AgentRegistration,
  AgentStatus,
  CreditEvent,
  CreditLedgerEntry,
  Guardian,
  GuardianRegistration,
  RegistryClientOptions,
  VerifyResult,
} from './types.js';

import {
  getAgent,
  getAgentById,
  listAgents,
  registerAgent,
  revokeAgent,
  suspendAgent,
  updateAgent,
} from './agents.js';

import { getGuardian, getGuardianAgents, registerGuardian } from './guardians.js';

import { getCreditHistory, getCredits, recordCreditEvent } from './credits.js';

import { checkAgentStatus, verifyAgentSignature } from './verify.js';

/**
 * Registry Client for agent registration and discovery
 */
export class RegistryClient {
  private supabase: SupabaseClient;

  constructor(options: RegistryClientOptions) {
    this.supabase = createClient(options.supabaseUrl, options.supabaseKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  // ============ Agent Operations ============

  /**
   * Register a new agent in the registry
   */
  async registerAgent(agent: AgentRegistration): Promise<Agent> {
    return registerAgent(this.supabase, agent);
  }

  /**
   * Get an agent by DID
   */
  async getAgent(did: string): Promise<Agent | null> {
    return getAgent(this.supabase, did);
  }

  /**
   * Get an agent by internal ID
   */
  async getAgentById(id: string): Promise<Agent | null> {
    return getAgentById(this.supabase, id);
  }

  /**
   * List agents with optional filtering
   */
  async listAgents(filter?: {
    status?: AgentStatus;
    guardianId?: string;
  }): Promise<Agent[]> {
    return listAgents(this.supabase, filter);
  }

  /**
   * Update agent metadata
   */
  async updateAgent(
    did: string,
    updates: Partial<Pick<Agent, 'name' | 'description' | 'capabilities' | 'metadata'>>
  ): Promise<Agent> {
    return updateAgent(this.supabase, did, updates);
  }

  /**
   * Suspend an agent
   */
  async suspendAgent(did: string, reason: string): Promise<Agent> {
    return suspendAgent(this.supabase, did, reason);
  }

  /**
   * Revoke an agent permanently
   */
  async revokeAgent(did: string, reason: string): Promise<Agent> {
    return revokeAgent(this.supabase, did, reason);
  }

  // ============ Guardian Operations ============

  /**
   * Register a new guardian
   */
  async registerGuardian(guardian: GuardianRegistration): Promise<Guardian> {
    return registerGuardian(this.supabase, guardian);
  }

  /**
   * Get a guardian by GitHub ID
   */
  async getGuardian(githubId: string): Promise<Guardian | null> {
    return getGuardian(this.supabase, githubId);
  }

  /**
   * Get all agents for a guardian
   */
  async getGuardianAgents(githubId: string): Promise<Agent[]> {
    return getGuardianAgents(this.supabase, githubId);
  }

  // ============ Credit Operations ============

  /**
   * Get current credit balance for an agent
   */
  async getCredits(did: string): Promise<number> {
    return getCredits(this.supabase, did);
  }

  /**
   * Record a credit event (e.g., PR merged, test failure)
   */
  async recordCreditEvent(did: string, event: CreditEvent): Promise<CreditLedgerEntry> {
    return recordCreditEvent(this.supabase, did, event);
  }

  /**
   * Get credit history for an agent
   */
  async getCreditHistory(did: string, limit?: number): Promise<CreditLedgerEntry[]> {
    return getCreditHistory(this.supabase, did, limit);
  }

  // ============ Verification Operations ============

  /**
   * Verify an agent's signature on a message
   */
  async verifyAgentSignature(
    did: string,
    signature: string,
    message: string,
    timestamp: string
  ): Promise<VerifyResult> {
    return verifyAgentSignature(this.supabase, did, signature, message, timestamp);
  }

  /**
   * Check agent status and credits
   */
  async checkAgentStatus(did: string): Promise<{ status: AgentStatus; credits: number } | null> {
    return checkAgentStatus(this.supabase, did);
  }
}
