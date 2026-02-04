/**
 * Tests for HTTP request signing and verification
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { generateKeyPair } from '../keys.js';
import { signRequest, verifyRequest } from '../request.js';
import type { KeyPair, SignableRequest } from '../types.js';

describe('request', () => {
  let keypair: KeyPair;

  beforeEach(async () => {
    keypair = await generateKeyPair();
  });

  describe('signRequest', () => {
    it('should return all required headers', async () => {
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/agents',
        body: JSON.stringify({ name: 'test' }),
      };

      const headers = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test123',
      });

      expect(headers).toHaveProperty('X-Agent-Signature');
      expect(headers).toHaveProperty('X-Agent-DID');
      expect(headers).toHaveProperty('X-Agent-Timestamp');
      expect(typeof headers['X-Agent-Signature']).toBe('string');
      expect(headers['X-Agent-DID']).toBe('did:agent:test123');
      expect(typeof headers['X-Agent-Timestamp']).toBe('string');
    });

    it('should include correct timestamp format (ISO 8601 numeric)', async () => {
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/agents',
      };

      const headers = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test123',
      });

      const timestamp = Number.parseInt(headers['X-Agent-Timestamp'], 10);
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now() + 1000); // Allow 1s tolerance
    });

    it('should include correct DID', async () => {
      const request: SignableRequest = {
        method: 'GET',
        url: '/api/status',
      };

      const did = 'did:agent:abc123xyz';
      const headers = await signRequest(request, {
        privateKey: keypair.privateKey,
        did,
      });

      expect(headers['X-Agent-DID']).toBe(did);
    });

    it('should use provided timestamp if given', async () => {
      const customTimestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/test',
        timestamp: customTimestamp,
      };

      const headers = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      expect(headers['X-Agent-Timestamp']).toBe(customTimestamp.toString());
    });

    it('should produce different signatures for different requests', async () => {
      const request1: SignableRequest = {
        method: 'POST',
        url: '/api/agents',
        body: JSON.stringify({ name: 'agent1' }),
      };

      const request2: SignableRequest = {
        method: 'POST',
        url: '/api/agents',
        body: JSON.stringify({ name: 'agent2' }),
      };

      const headers1 = await signRequest(request1, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      const headers2 = await signRequest(request2, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      expect(headers1['X-Agent-Signature']).not.toBe(headers2['X-Agent-Signature']);
    });
  });

  describe('verifyRequest', () => {
    it('should return valid:true for correctly signed request', async () => {
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/agents',
        body: JSON.stringify({ name: 'test' }),
      };

      const signedHeaders = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      const headers = {
        ...signedHeaders,
        'X-Agent-Method': request.method,
        'X-Agent-URL': request.url,
      };

      const result = await verifyRequest(headers, keypair.publicKey, request.body);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid:false for expired timestamp', async () => {
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/test',
        timestamp: oldTimestamp,
      };

      const signedHeaders = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      const headers = {
        ...signedHeaders,
        'X-Agent-Method': request.method,
        'X-Agent-URL': request.url,
      };

      const result = await verifyRequest(headers, keypair.publicKey);

      expect(result.valid).toBe(false);
      expect(result.expiredTimestamp).toBe(true);
      expect(result.error).toContain('tolerance');
    });

    it('should return valid:false for wrong body', async () => {
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/test',
        body: JSON.stringify({ name: 'original' }),
      };

      const signedHeaders = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      const headers = {
        ...signedHeaders,
        'X-Agent-Method': request.method,
        'X-Agent-URL': request.url,
      };

      // Try to verify with different body
      const result = await verifyRequest(
        headers,
        keypair.publicKey,
        JSON.stringify({ name: 'tampered' })
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should return valid:false for wrong public key', async () => {
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/test',
        body: JSON.stringify({ name: 'test' }),
      };

      const signedHeaders = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      const headers = {
        ...signedHeaders,
        'X-Agent-Method': request.method,
        'X-Agent-URL': request.url,
      };

      // Generate a different keypair for verification
      const wrongKeypair = await generateKeyPair();

      const result = await verifyRequest(headers, wrongKeypair.publicKey, request.body);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should respect custom tolerance', async () => {
      const customTimestamp = Date.now() - 7 * 60 * 1000; // 7 minutes ago
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/test',
        timestamp: customTimestamp,
      };

      const signedHeaders = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      const headers = {
        ...signedHeaders,
        'X-Agent-Method': request.method,
        'X-Agent-URL': request.url,
      };

      // Should fail with default 5-minute tolerance
      const result1 = await verifyRequest(headers, keypair.publicKey);
      expect(result1.valid).toBe(false);
      expect(result1.expiredTimestamp).toBe(true);

      // Should pass with 10-minute tolerance
      const result2 = await verifyRequest(headers, keypair.publicKey, undefined, 10 * 60 * 1000);
      expect(result2.valid).toBe(true);
    });

    it('should return error for missing signature header', async () => {
      const headers = {
        'X-Agent-DID': 'did:agent:test',
        'X-Agent-Timestamp': Date.now().toString(),
      };

      const result = await verifyRequest(headers, keypair.publicKey);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing X-Agent-Signature');
    });

    it('should return error for missing timestamp header', async () => {
      const headers = {
        'X-Agent-Signature': 'somesignature',
        'X-Agent-DID': 'did:agent:test',
      };

      const result = await verifyRequest(headers, keypair.publicKey);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing X-Agent-Timestamp');
    });

    it('should handle case-insensitive headers', async () => {
      const request: SignableRequest = {
        method: 'POST',
        url: '/api/test',
        body: 'test',
      };

      const signedHeaders = await signRequest(request, {
        privateKey: keypair.privateKey,
        did: 'did:agent:test',
      });

      // Convert to lowercase
      const headers = {
        'x-agent-signature': signedHeaders['X-Agent-Signature'],
        'x-agent-did': signedHeaders['X-Agent-DID'],
        'x-agent-timestamp': signedHeaders['X-Agent-Timestamp'],
        'x-agent-method': request.method,
        'x-agent-url': request.url,
      };

      const result = await verifyRequest(headers, keypair.publicKey, request.body);

      expect(result.valid).toBe(true);
    });
  });
});
