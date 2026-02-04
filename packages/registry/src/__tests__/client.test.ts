/**
 * @agent-oss/registry - Client Tests
 * Tests for RegistryClient with mocked Supabase
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistryClient } from '../client.js';
import type { AgentRow, CreditLedgerRow, GuardianRow } from '../types.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock implementation of Supabase client
// biome-ignore lint/suspicious/noExplicitAny: Test mock requires any type
let mockSupabaseClient: any;
// biome-ignore lint/suspicious/noExplicitAny: Test mock requires any type
let mockFromResponse: any;

beforeEach(() => {
  // Reset mocks before each test
  mockFromResponse = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  mockSupabaseClient = {
    from: vi.fn(() => mockFromResponse),
    rpc: vi.fn(),
  };
});

describe('RegistryClient', () => {
  describe('Constructor', () => {
    it('should accept options and create client', () => {
      const client = new RegistryClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
      });
      expect(client).toBeInstanceOf(RegistryClient);
    });
  });

  describe('Guardian Operations', () => {
    describe('registerGuardian', () => {
      it('should send correct data to Supabase', async () => {
        const mockGuardianRow: GuardianRow = {
          id: 'guardian-uuid',
          github_id: 'testuser',
          email: 'test@example.com',
          agreed_to_terms_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockFromResponse.single.mockResolvedValue({
          data: mockGuardianRow,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.registerGuardian({
          githubId: 'testuser',
          email: 'test@example.com',
          agreedToTermsAt: '2024-01-01T00:00:00Z',
        });

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('guardians');
        expect(mockFromResponse.insert).toHaveBeenCalledWith({
          github_id: 'testuser',
          email: 'test@example.com',
          agreed_to_terms_at: '2024-01-01T00:00:00Z',
          public_key: undefined,
        });
        expect(result.githubId).toBe('testuser');
      });

      it('should throw error on database failure', async () => {
        mockFromResponse.single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        await expect(
          client.registerGuardian({
            githubId: 'testuser',
            email: 'test@example.com',
            agreedToTermsAt: '2024-01-01T00:00:00Z',
          })
        ).rejects.toThrow('Failed to register guardian');
      });
    });

    describe('getGuardian', () => {
      it('should return null when not found', async () => {
        mockFromResponse.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.getGuardian('nonexistent');
        expect(result).toBeNull();
      });

      it('should return guardian when found', async () => {
        const mockGuardianRow = {
          id: 'guardian-uuid',
          github_id: 'testuser',
          email: 'test@example.com',
          agreed_to_terms_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          agent_count: [{ count: 3 }],
        };

        mockFromResponse.single.mockResolvedValue({
          data: mockGuardianRow,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.getGuardian('testuser');
        expect(result).not.toBeNull();
        expect(result?.githubId).toBe('testuser');
        expect(result?.agentCount).toBe(3);
      });

      it('should handle missing agent count gracefully', async () => {
        const mockGuardianRow = {
          id: 'guardian-uuid',
          github_id: 'testuser',
          email: 'test@example.com',
          agreed_to_terms_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockFromResponse.single.mockResolvedValue({
          data: mockGuardianRow,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.getGuardian('testuser');
        expect(result?.agentCount).toBe(0);
      });
    });
  });

  describe('Agent Operations', () => {
    describe('registerAgent', () => {
      it('should validate guardian exists first', async () => {
        // First call: guardian lookup fails
        mockFromResponse.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        await expect(
          client.registerAgent({
            did: 'did:agent:test',
            publicKey: 'pk_test',
            name: 'Test Agent',
            guardianGithubId: 'nonexistent',
            didDocument: { id: 'did:agent:test' },
          })
        ).rejects.toThrow('Guardian not found');
      });

      it('should create agent with correct initial credits (100)', async () => {
        // First call: guardian lookup succeeds
        mockFromResponse.single
          .mockResolvedValueOnce({
            data: { id: 'guardian-uuid' },
            error: null,
          })
          // Second call: agent creation
          .mockResolvedValueOnce({
            data: {
              id: 'agent-uuid',
              did: 'did:agent:test',
              public_key: 'pk_test',
              name: 'Test Agent',
              guardian_id: 'guardian-uuid',
              status: 'active',
              credits: 100,
              trust_score: 1.0,
              did_document: { id: 'did:agent:test' },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            } as AgentRow,
            error: null,
          });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.registerAgent({
          did: 'did:agent:test',
          publicKey: 'pk_test',
          name: 'Test Agent',
          guardianGithubId: 'testuser',
          didDocument: { id: 'did:agent:test' },
        });

        expect(result.credits).toBe(100);
        expect(result.status).toBe('active');
      });
    });

    describe('getAgent', () => {
      it('should return null when not found', async () => {
        mockFromResponse.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.getAgent('did:agent:nonexistent');
        expect(result).toBeNull();
      });

      it('should return agent when found', async () => {
        const mockAgentRow: AgentRow = {
          id: 'agent-uuid',
          did: 'did:agent:test',
          public_key: 'pk_test',
          name: 'Test Agent',
          guardian_id: 'guardian-uuid',
          status: 'active',
          credits: 100,
          trust_score: 1.0,
          did_document: { id: 'did:agent:test' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockFromResponse.single.mockResolvedValue({
          data: mockAgentRow,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.getAgent('did:agent:test');
        expect(result).not.toBeNull();
        expect(result?.did).toBe('did:agent:test');
        expect(result?.credits).toBe(100);
      });
    });

    describe('updateAgent', () => {
      it('should only update allowed fields', async () => {
        const mockAgentRow: AgentRow = {
          id: 'agent-uuid',
          did: 'did:agent:test',
          public_key: 'pk_test',
          name: 'Updated Agent',
          description: 'Updated description',
          guardian_id: 'guardian-uuid',
          status: 'active',
          credits: 100,
          trust_score: 1.0,
          capabilities: ['new', 'capabilities'],
          metadata: { version: '2.0' },
          did_document: { id: 'did:agent:test' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        };

        mockFromResponse.single.mockResolvedValue({
          data: mockAgentRow,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.updateAgent('did:agent:test', {
          name: 'Updated Agent',
          description: 'Updated description',
          capabilities: ['new', 'capabilities'],
          metadata: { version: '2.0' },
        });

        expect(mockFromResponse.update).toHaveBeenCalledWith({
          name: 'Updated Agent',
          description: 'Updated description',
          capabilities: ['new', 'capabilities'],
          metadata: { version: '2.0' },
        });
        expect(result.name).toBe('Updated Agent');
      });
    });

    describe('suspendAgent', () => {
      it('should change status to suspended', async () => {
        const mockAgentRow: AgentRow = {
          id: 'agent-uuid',
          did: 'did:agent:test',
          public_key: 'pk_test',
          name: 'Test Agent',
          guardian_id: 'guardian-uuid',
          status: 'suspended',
          credits: 100,
          trust_score: 0.8,
          did_document: { id: 'did:agent:test' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          revocation_reason: 'Policy violation',
        };

        mockFromResponse.single.mockResolvedValue({
          data: mockAgentRow,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.suspendAgent('did:agent:test', 'Policy violation');

        expect(mockFromResponse.update).toHaveBeenCalledWith({
          status: 'suspended',
          revocation_reason: 'Policy violation',
        });
        expect(result.status).toBe('suspended');
        expect(result.revocationReason).toBe('Policy violation');
      });
    });

    describe('revokeAgent', () => {
      it('should change status to revoked', async () => {
        const now = new Date().toISOString();
        const mockAgentRow: AgentRow = {
          id: 'agent-uuid',
          did: 'did:agent:test',
          public_key: 'pk_test',
          name: 'Test Agent',
          guardian_id: 'guardian-uuid',
          status: 'revoked',
          credits: 100,
          trust_score: 0.5,
          did_document: { id: 'did:agent:test' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          revoked_at: now,
          revocation_reason: 'Severe violation',
        };

        mockFromResponse.single.mockResolvedValue({
          data: mockAgentRow,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.revokeAgent('did:agent:test', 'Severe violation');

        expect(result.status).toBe('revoked');
        expect(result.revokedAt).toBeDefined();
        expect(result.revocationReason).toBe('Severe violation');
      });
    });
  });

  describe('Credit Operations', () => {
    describe('getCredits', () => {
      it('should return current credit balance', async () => {
        mockFromResponse.single.mockResolvedValue({
          data: { credits: 150 },
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.getCredits('did:agent:test');
        expect(result).toBe(150);
      });

      it('should throw error if agent not found', async () => {
        mockFromResponse.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        await expect(client.getCredits('did:agent:nonexistent')).rejects.toThrow('Agent not found');
      });
    });

    describe('recordCreditEvent', () => {
      it('should call RPC with correct parameters', async () => {
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: {
            id: 'ledger-uuid',
            agent_id: 'agent-uuid',
            event_type: 'pr_merged',
            amount: 10,
            balance_after: 110,
            reason: 'PR merged',
            created_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.recordCreditEvent('did:agent:test', {
          type: 'pr_merged',
          amount: 10,
          reason: 'PR merged',
        });

        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('record_credit_event_atomic', {
          p_did: 'did:agent:test',
          p_type: 'pr_merged',
          p_amount: 10,
          p_reason: 'PR merged',
          p_pr_url: null,
        });
        expect(result.balanceAfter).toBe(110);
      });

      it('should handle negative balance atomically', async () => {
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: {
            id: 'ledger-uuid',
            agent_id: 'agent-uuid',
            event_type: 'test_failure',
            amount: -20,
            balance_after: 0,
            reason: 'Test failed',
            created_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.recordCreditEvent('did:agent:test', {
          type: 'test_failure',
          amount: -20,
          reason: 'Test failed',
        });

        expect(result.balanceAfter).toBe(0);
      });

      it('should include prUrl when provided', async () => {
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: {
            id: 'ledger-uuid',
            agent_id: 'agent-uuid',
            event_type: 'pr_merged',
            amount: 10,
            balance_after: 110,
            reason: 'PR merged',
            pr_url: 'https://github.com/org/repo/pull/123',
            created_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.recordCreditEvent('did:agent:test', {
          type: 'pr_merged',
          amount: 10,
          reason: 'PR merged',
          prUrl: 'https://github.com/org/repo/pull/123',
        });

        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('record_credit_event_atomic', {
          p_did: 'did:agent:test',
          p_type: 'pr_merged',
          p_amount: 10,
          p_reason: 'PR merged',
          p_pr_url: 'https://github.com/org/repo/pull/123',
        });
        expect(result.prUrl).toBe('https://github.com/org/repo/pull/123');
      });
    });

    describe('getCreditHistory', () => {
      it('should return entries in descending order', async () => {
        const mockLedgerRows: CreditLedgerRow[] = [
          {
            id: 'ledger-3',
            agent_id: 'agent-uuid',
            type: 'pr_merged',
            amount: 10,
            balance_after: 120,
            reason: 'Latest PR',
            created_at: '2024-01-03T00:00:00Z',
          },
          {
            id: 'ledger-2',
            agent_id: 'agent-uuid',
            type: 'pr_merged',
            amount: 10,
            balance_after: 110,
            reason: 'Second PR',
            created_at: '2024-01-02T00:00:00Z',
          },
          {
            id: 'ledger-1',
            agent_id: 'agent-uuid',
            type: 'registration',
            amount: 100,
            balance_after: 100,
            reason: 'Initial credits',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        // First call: get agent
        mockFromResponse.single.mockResolvedValueOnce({
          data: { id: 'agent-uuid' },
          error: null,
        });

        // Second call: get history (no single() for multiple results)
        mockFromResponse.limit.mockResolvedValue({
          data: mockLedgerRows,
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        const result = await client.getCreditHistory('did:agent:test');

        expect(mockFromResponse.order).toHaveBeenCalledWith('created_at', {
          ascending: false,
        });
        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('ledger-3');
        expect(result[2].id).toBe('ledger-1');
      });

      it('should respect limit parameter', async () => {
        // First call: get agent
        mockFromResponse.single.mockResolvedValueOnce({
          data: { id: 'agent-uuid' },
          error: null,
        });

        // Second call: get history with limit
        mockFromResponse.limit.mockResolvedValue({
          data: [],
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        await client.getCreditHistory('did:agent:test', 10);

        expect(mockFromResponse.limit).toHaveBeenCalledWith(10);
      });

      it('should use default limit of 50', async () => {
        // First call: get agent
        mockFromResponse.single.mockResolvedValueOnce({
          data: { id: 'agent-uuid' },
          error: null,
        });

        // Second call: get history
        mockFromResponse.limit.mockResolvedValue({
          data: [],
          error: null,
        });

        const client = new RegistryClient({
          supabaseUrl: 'https://test.supabase.co',
          supabaseKey: 'test-key',
        });

        await client.getCreditHistory('did:agent:test');

        expect(mockFromResponse.limit).toHaveBeenCalledWith(50);
      });
    });
  });
});
