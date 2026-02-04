/**
 * @antfarm/registry - Verification Operations
 * Operations for verifying agent signatures and status
 */

import { verifyRequest } from '@antfarm/crypto';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Agent, AgentRow, AgentStatus, VerifyResult } from './types.js';

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
 * Verify an agent's signature on a message
 */
export async function verifyAgentSignature(
  supabase: SupabaseClient,
  did: string,
  signature: string,
  message: string,
  timestamp: string
): Promise<VerifyResult> {
  // Get the agent from registry
  const { data, error } = await supabase.from('agents').select('*').eq('did', did).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        valid: false,
        error: `Agent not found: ${did}`,
      };
    }
    return {
      valid: false,
      error: `Database error: ${error.message}`,
    };
  }

  const agent = rowToAgent(data as AgentRow);

  // Check agent status
  if (agent.status !== 'active') {
    return {
      valid: false,
      agent,
      error: `Agent is ${agent.status}`,
    };
  }

  // Check for replay attack - hash the signature and check if it was already used
  const signatureHash = bytesToHex(sha256(new TextEncoder().encode(signature)));

  const { data: cached } = await supabase
    .from('signature_cache')
    .select('signature_hash')
    .eq('signature_hash', signatureHash)
    .single();

  if (cached) {
    return {
      valid: false,
      agent,
      error: 'Signature already used (replay attack detected)',
    };
  }

  // Verify the signature using crypto library
  try {
    // Convert hex public key to Uint8Array
    const hexPairs = agent.publicKey.match(/.{1,2}/g);
    if (!hexPairs) {
      return {
        valid: false,
        agent,
        error: 'Invalid public key format',
      };
    }
    const publicKeyBytes = new Uint8Array(
      hexPairs.map((byte) => Number.parseInt(byte, 16))
    );

    const result = await verifyRequest(
      {
        'x-agent-signature': signature,
        'x-agent-timestamp': timestamp,
      },
      publicKeyBytes,
      message
    );

    if (!result.valid) {
      return {
        valid: false,
        agent,
        error: result.error || 'Signature verification failed',
      };
    }

    // Cache the signature to prevent replay attacks
    await supabase.from('signature_cache').insert({
      signature_hash: signatureHash,
      agent_did: did,
      timestamp: new Date(Number.parseInt(timestamp)).toISOString(),
    });

    return {
      valid: true,
      agent,
    };
  } catch (err) {
    return {
      valid: false,
      agent,
      error: err instanceof Error ? err.message : 'Verification error',
    };
  }
}

/**
 * Check agent status and credits
 */
export async function checkAgentStatus(
  supabase: SupabaseClient,
  did: string
): Promise<{ status: AgentStatus; credits: number } | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('status, credits')
    .eq('did', did)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to check agent status: ${error.message}`);
  }

  return data as { status: AgentStatus; credits: number };
}
