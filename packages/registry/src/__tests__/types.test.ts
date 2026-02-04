/**
 * @antfarm/registry - Type Definitions Tests
 * Tests for type guards and type conversions
 */

import { describe, expect, it } from 'vitest';
import type {
  Agent,
  AgentRegistration,
  AgentRow,
  AgentStatus,
  CreditEvent,
  CreditEventType,
  CreditLedgerEntry,
  CreditLedgerRow,
  Guardian,
  GuardianRegistration,
  GuardianRow,
  RegistryClientOptions,
  VerifyResult,
  ViolationSeverity,
} from '../types.js';

describe('Type Definitions', () => {
  describe('AgentStatus', () => {
    it('should accept valid status values', () => {
      const statuses: AgentStatus[] = ['active', 'suspended', 'revoked'];
      expect(statuses).toHaveLength(3);
      expect(statuses).toContain('active');
      expect(statuses).toContain('suspended');
      expect(statuses).toContain('revoked');
    });
  });

  describe('CreditEventType', () => {
    it('should accept valid credit event types', () => {
      const types: CreditEventType[] = [
        'registration',
        'pr_merged',
        'pr_rejected',
        'test_failure',
        'security_issue',
        'manual_adjustment',
      ];
      expect(types).toHaveLength(6);
      expect(types).toContain('registration');
      expect(types).toContain('pr_merged');
    });
  });

  describe('ViolationSeverity', () => {
    it('should accept valid severity levels', () => {
      const severities: ViolationSeverity[] = ['minor', 'moderate', 'severe'];
      expect(severities).toHaveLength(3);
      expect(severities).toContain('minor');
      expect(severities).toContain('severe');
    });
  });

  describe('GuardianRegistration', () => {
    it('should create valid guardian registration', () => {
      const registration: GuardianRegistration = {
        githubId: 'testuser',
        email: 'test@example.com',
        agreedToTermsAt: '2024-01-01T00:00:00Z',
      };
      expect(registration.githubId).toBe('testuser');
      expect(registration.email).toBe('test@example.com');
    });

    it('should accept optional publicKey', () => {
      const registration: GuardianRegistration = {
        githubId: 'testuser',
        email: 'test@example.com',
        agreedToTermsAt: '2024-01-01T00:00:00Z',
        publicKey: 'pk_test123',
      };
      expect(registration.publicKey).toBe('pk_test123');
    });
  });

  describe('Guardian', () => {
    it('should extend GuardianRegistration with additional fields', () => {
      const guardian: Guardian = {
        id: 'uuid-123',
        githubId: 'testuser',
        email: 'test@example.com',
        agreedToTermsAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(guardian.id).toBe('uuid-123');
      expect(guardian.githubId).toBe('testuser');
    });

    it('should accept optional agentCount', () => {
      const guardian: Guardian = {
        id: 'uuid-123',
        githubId: 'testuser',
        email: 'test@example.com',
        agreedToTermsAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        agentCount: 5,
      };
      expect(guardian.agentCount).toBe(5);
    });
  });

  describe('AgentRegistration', () => {
    it('should create valid agent registration', () => {
      const registration: AgentRegistration = {
        did: 'did:agent:test123',
        publicKey: 'pk_agent123',
        name: 'Test Agent',
        guardianGithubId: 'testuser',
        didDocument: { id: 'did:agent:test123' },
      };
      expect(registration.did).toBe('did:agent:test123');
      expect(registration.name).toBe('Test Agent');
    });

    it('should accept optional fields', () => {
      const registration: AgentRegistration = {
        did: 'did:agent:test123',
        publicKey: 'pk_agent123',
        name: 'Test Agent',
        description: 'A test agent',
        guardianGithubId: 'testuser',
        capabilities: ['code', 'test'],
        metadata: { version: '1.0' },
        didDocument: { id: 'did:agent:test123' },
      };
      expect(registration.description).toBe('A test agent');
      expect(registration.capabilities).toEqual(['code', 'test']);
      expect(registration.metadata).toEqual({ version: '1.0' });
    });
  });

  describe('Agent', () => {
    it('should create complete agent entity', () => {
      const agent: Agent = {
        id: 'uuid-456',
        did: 'did:agent:test123',
        publicKey: 'pk_agent123',
        name: 'Test Agent',
        guardianId: 'uuid-123',
        status: 'active',
        credits: 100,
        trustScore: 1.0,
        didDocument: { id: 'did:agent:test123' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(agent.id).toBe('uuid-456');
      expect(agent.status).toBe('active');
      expect(agent.credits).toBe(100);
    });

    it('should accept revocation fields when revoked', () => {
      const agent: Agent = {
        id: 'uuid-456',
        did: 'did:agent:test123',
        publicKey: 'pk_agent123',
        name: 'Test Agent',
        guardianId: 'uuid-123',
        status: 'revoked',
        credits: 0,
        trustScore: 0.5,
        didDocument: { id: 'did:agent:test123' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        revokedAt: '2024-01-02T00:00:00Z',
        revocationReason: 'Policy violation',
      };
      expect(agent.status).toBe('revoked');
      expect(agent.revokedAt).toBe('2024-01-02T00:00:00Z');
      expect(agent.revocationReason).toBe('Policy violation');
    });
  });

  describe('CreditEvent', () => {
    it('should create valid credit event', () => {
      const event: CreditEvent = {
        type: 'pr_merged',
        amount: 10,
        reason: 'PR #123 merged',
      };
      expect(event.type).toBe('pr_merged');
      expect(event.amount).toBe(10);
    });

    it('should accept optional prUrl', () => {
      const event: CreditEvent = {
        type: 'pr_merged',
        amount: 10,
        reason: 'PR #123 merged',
        prUrl: 'https://github.com/org/repo/pull/123',
      };
      expect(event.prUrl).toBe('https://github.com/org/repo/pull/123');
    });

    it('should accept negative amounts', () => {
      const event: CreditEvent = {
        type: 'test_failure',
        amount: -5,
        reason: 'Test suite failed',
      };
      expect(event.amount).toBe(-5);
    });
  });

  describe('CreditLedgerEntry', () => {
    it('should extend CreditEvent with ledger fields', () => {
      const entry: CreditLedgerEntry = {
        id: 'uuid-789',
        agentId: 'uuid-456',
        type: 'pr_merged',
        amount: 10,
        balanceAfter: 110,
        reason: 'PR #123 merged',
        createdAt: '2024-01-01T00:00:00Z',
      };
      expect(entry.id).toBe('uuid-789');
      expect(entry.balanceAfter).toBe(110);
    });
  });

  describe('VerifyResult', () => {
    it('should create valid verification result', () => {
      const result: VerifyResult = {
        valid: true,
        agent: {
          id: 'uuid-456',
          did: 'did:agent:test123',
          publicKey: 'pk_agent123',
          name: 'Test Agent',
          guardianId: 'uuid-123',
          status: 'active',
          credits: 100,
          trustScore: 1.0,
          didDocument: { id: 'did:agent:test123' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };
      expect(result.valid).toBe(true);
      expect(result.agent?.did).toBe('did:agent:test123');
    });

    it('should create invalid verification result with error', () => {
      const result: VerifyResult = {
        valid: false,
        error: 'Invalid signature',
      };
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });
  });

  describe('RegistryClientOptions', () => {
    it('should create valid client options', () => {
      const options: RegistryClientOptions = {
        supabaseUrl: 'https://example.supabase.co',
        supabaseKey: 'test-key-123',
      };
      expect(options.supabaseUrl).toBe('https://example.supabase.co');
      expect(options.supabaseKey).toBe('test-key-123');
    });
  });

  describe('Database Row Types (snake_case)', () => {
    it('should create GuardianRow with snake_case fields', () => {
      const row: GuardianRow = {
        id: 'uuid-123',
        github_id: 'testuser',
        email: 'test@example.com',
        agreed_to_terms_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      expect(row.github_id).toBe('testuser');
      expect(row.agreed_to_terms_at).toBe('2024-01-01T00:00:00Z');
    });

    it('should create AgentRow with snake_case fields', () => {
      const row: AgentRow = {
        id: 'uuid-456',
        did: 'did:agent:test123',
        public_key: 'pk_agent123',
        name: 'Test Agent',
        guardian_id: 'uuid-123',
        status: 'active',
        credits: 100,
        trust_score: 1.0,
        did_document: { id: 'did:agent:test123' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      expect(row.public_key).toBe('pk_agent123');
      expect(row.guardian_id).toBe('uuid-123');
      expect(row.trust_score).toBe(1.0);
    });

    it('should create CreditLedgerRow with snake_case fields', () => {
      const row: CreditLedgerRow = {
        id: 'uuid-789',
        agent_id: 'uuid-456',
        type: 'pr_merged',
        amount: 10,
        balance_after: 110,
        reason: 'PR #123 merged',
        created_at: '2024-01-01T00:00:00Z',
      };
      expect(row.agent_id).toBe('uuid-456');
      expect(row.balance_after).toBe(110);
    });
  });
});
