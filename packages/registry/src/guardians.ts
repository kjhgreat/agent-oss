/**
 * @agent-oss/registry - Guardian Operations
 * Operations for managing agent guardians
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Agent, AgentRow, Guardian, GuardianRegistration, GuardianRow } from './types.js';

/**
 * Convert database row to Guardian interface
 */
function rowToGuardian(row: GuardianRow & { agent_count?: number }): Guardian {
  return {
    id: row.id,
    githubId: row.github_id,
    email: row.email,
    agreedToTermsAt: row.agreed_to_terms_at,
    publicKey: row.public_key,
    agentCount: row.agent_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert agent row to Agent interface
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
 * Register a new guardian
 */
export async function registerGuardian(
  supabase: SupabaseClient,
  guardian: GuardianRegistration
): Promise<Guardian> {
  const { data, error } = await supabase
    .from('guardians')
    .insert({
      github_id: guardian.githubId,
      email: guardian.email,
      agreed_to_terms_at: guardian.agreedToTermsAt,
      public_key: guardian.publicKey,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register guardian: ${error.message}`);
  }

  return rowToGuardian(data as GuardianRow);
}

/**
 * Get guardian by GitHub ID
 */
export async function getGuardian(
  supabase: SupabaseClient,
  githubId: string
): Promise<Guardian | null> {
  const { data, error } = await supabase
    .from('guardians')
    .select('*, agent_count:agents(count)')
    .eq('github_id', githubId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get guardian: ${error.message}`);
  }

  // Extract agent count from the nested structure
  const agentCountData = data as GuardianRow & { agent_count?: Array<{ count: number }> };
  const agentCount = agentCountData.agent_count?.[0]?.count ?? 0;

  return rowToGuardian({
    ...(data as GuardianRow),
    agent_count: agentCount,
  });
}

/**
 * Get all agents for a guardian
 */
export async function getGuardianAgents(
  supabase: SupabaseClient,
  githubId: string
): Promise<Agent[]> {
  // First, get the guardian ID
  const { data: guardian, error: guardianError } = await supabase
    .from('guardians')
    .select('id')
    .eq('github_id', githubId)
    .single();

  if (guardianError || !guardian) {
    throw new Error(`Guardian not found: ${githubId}`);
  }

  // Then get all agents for this guardian
  const { data, error } = await supabase.from('agents').select('*').eq('guardian_id', guardian.id);

  if (error) {
    throw new Error(`Failed to get guardian agents: ${error.message}`);
  }

  return (data as AgentRow[]).map(rowToAgent);
}
