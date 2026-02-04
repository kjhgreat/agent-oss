/**
 * @agent-oss/registry - Agent Operations
 * CRUD operations for agent entities
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Agent, AgentRegistration, AgentRow, AgentStatus } from './types.js';

/**
 * Convert database row to Agent interface
 */
function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    did: row.did,
    publicKey: row.public_key,
    name: row.name,
    description: row.description,
    guardianId: row.guardian_id,
    status: row.status,
    credits: row.credits,
    trustScore: row.trust_score,
    capabilities: row.capabilities,
    metadata: row.metadata,
    didDocument: row.did_document,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
  };
}

/**
 * Register a new agent
 */
export async function registerAgent(
  supabase: SupabaseClient,
  agent: AgentRegistration
): Promise<Agent> {
  // First, resolve guardian_id from github_id
  const { data: guardian, error: guardianError } = await supabase
    .from('guardians')
    .select('id')
    .eq('github_id', agent.guardianGithubId)
    .single();

  if (guardianError || !guardian) {
    throw new Error(
      `Guardian not found: ${agent.guardianGithubId}. Please register as a guardian first.`
    );
  }

  const { data, error } = await supabase
    .from('agents')
    .insert({
      did: agent.did,
      public_key: agent.publicKey,
      name: agent.name,
      description: agent.description,
      guardian_id: guardian.id,
      capabilities: agent.capabilities,
      metadata: agent.metadata,
      did_document: agent.didDocument,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register agent: ${error.message}`);
  }

  return rowToAgent(data as AgentRow);
}

/**
 * Get agent by DID
 */
export async function getAgent(supabase: SupabaseClient, did: string): Promise<Agent | null> {
  const { data, error } = await supabase.from('agents').select('*').eq('did', did).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get agent: ${error.message}`);
  }

  return rowToAgent(data as AgentRow);
}

/**
 * Get agent by ID
 */
export async function getAgentById(supabase: SupabaseClient, id: string): Promise<Agent | null> {
  const { data, error } = await supabase.from('agents').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get agent: ${error.message}`);
  }

  return rowToAgent(data as AgentRow);
}

/**
 * List agents with optional filtering
 */
export async function listAgents(
  supabase: SupabaseClient,
  filter?: { status?: AgentStatus; guardianId?: string }
): Promise<Agent[]> {
  let query = supabase.from('agents').select('*');

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  if (filter?.guardianId) {
    query = query.eq('guardian_id', filter.guardianId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list agents: ${error.message}`);
  }

  return (data as AgentRow[]).map(rowToAgent);
}

/**
 * Update agent metadata
 */
export async function updateAgent(
  supabase: SupabaseClient,
  did: string,
  updates: Partial<Pick<Agent, 'name' | 'description' | 'capabilities' | 'metadata'>>
): Promise<Agent> {
  const updateData: Partial<{
    name: string;
    description: string;
    capabilities: string[];
    metadata: Record<string, unknown>;
  }> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.capabilities !== undefined) updateData.capabilities = updates.capabilities;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { data, error } = await supabase
    .from('agents')
    .update(updateData)
    .eq('did', did)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update agent: ${error.message}`);
  }

  return rowToAgent(data as AgentRow);
}

/**
 * Suspend an agent
 */
export async function suspendAgent(
  supabase: SupabaseClient,
  did: string,
  reason: string
): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .update({
      status: 'suspended',
      revocation_reason: reason,
    })
    .eq('did', did)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to suspend agent: ${error.message}`);
  }

  return rowToAgent(data as AgentRow);
}

/**
 * Revoke an agent
 */
export async function revokeAgent(
  supabase: SupabaseClient,
  did: string,
  reason: string
): Promise<Agent> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('agents')
    .update({
      status: 'revoked',
      revoked_at: now,
      revocation_reason: reason,
    })
    .eq('did', did)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to revoke agent: ${error.message}`);
  }

  return rowToAgent(data as AgentRow);
}
