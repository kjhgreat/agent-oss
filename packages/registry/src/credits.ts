/**
 * @agent-oss/registry - Credit System Operations
 * Operations for managing agent credits and ledger
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreditEvent, CreditLedgerEntry, CreditLedgerRow } from './types.js';

/**
 * Convert database row to CreditLedgerEntry
 */
function rowToLedgerEntry(row: CreditLedgerRow): CreditLedgerEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    type: row.type,
    amount: row.amount,
    balanceAfter: row.balance_after,
    reason: row.reason,
    prUrl: row.pr_url,
    createdAt: row.created_at,
  };
}

/**
 * Get current credit balance for an agent
 */
export async function getCredits(supabase: SupabaseClient, did: string): Promise<number> {
  const { data, error } = await supabase.from('agents').select('credits').eq('did', did).single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`Agent not found: ${did}`);
    }
    throw new Error(`Failed to get credits: ${error.message}`);
  }

  return (data as { credits: number }).credits;
}

/**
 * Record a credit event (transaction with balance update)
 * Uses atomic database function to prevent race conditions
 */
export async function recordCreditEvent(
  supabase: SupabaseClient,
  did: string,
  event: CreditEvent
): Promise<CreditLedgerEntry> {
  const { data, error } = await supabase.rpc('record_credit_event_atomic', {
    p_did: did,
    p_type: event.type,
    p_amount: event.amount,
    p_reason: event.reason,
    p_pr_url: event.prUrl || null,
  });

  if (error) {
    throw new Error(`Failed to record credit event: ${error.message}`);
  }

  return rowToLedgerEntry(data as CreditLedgerRow);
}

/**
 * Get credit history for an agent
 */
export async function getCreditHistory(
  supabase: SupabaseClient,
  did: string,
  limit = 50
): Promise<CreditLedgerEntry[]> {
  // First get the agent ID
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id')
    .eq('did', did)
    .single();

  if (agentError || !agent) {
    throw new Error(`Agent not found: ${did}`);
  }

  const { data, error } = await supabase
    .from('credit_ledger')
    .select('*')
    .eq('agent_id', (agent as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get credit history: ${error.message}`);
  }

  return (data as CreditLedgerRow[]).map(rowToLedgerEntry);
}
