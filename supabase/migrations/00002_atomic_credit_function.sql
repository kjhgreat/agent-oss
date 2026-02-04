-- Atomic credit function to prevent race conditions
-- This function locks the agent row and updates credits atomically

CREATE OR REPLACE FUNCTION record_credit_event_atomic(
  p_did VARCHAR,
  p_type credit_event_type,
  p_amount INTEGER,
  p_reason TEXT,
  p_pr_url VARCHAR DEFAULT NULL
) RETURNS credit_ledger AS $$
DECLARE
  v_agent_id UUID;
  v_new_balance INTEGER;
  v_result credit_ledger;
BEGIN
  -- Lock the row and update atomically
  UPDATE agents
  SET credits = GREATEST(0, credits + p_amount)
  WHERE did = p_did
  RETURNING id, credits INTO v_agent_id, v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found: %', p_did;
  END IF;

  INSERT INTO credit_ledger (agent_id, event_type, amount, balance_after, reason, pr_url)
  VALUES (v_agent_id, p_type, p_amount, v_new_balance, p_reason, p_pr_url)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
