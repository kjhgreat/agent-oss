import { describe, expect, it } from 'vitest';
import { createDIDDocument } from '../document.js';

describe('createDIDDocument', () => {
  const mockPublicKey = 'pNz3i4YSILeGNly2RXF_IBkLnRKHqcOB2PO-xDECFsQ'; // base64url encoded 32 bytes

  it('returns valid DID document structure', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc).toHaveProperty('@context');
    expect(doc).toHaveProperty('id');
    expect(doc).toHaveProperty('verificationMethod');
    expect(doc).toHaveProperty('authentication');
    expect(doc).toHaveProperty('assertionMethod');
  });

  it('includes correct @context', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc['@context']).toEqual([
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ]);
  });

  it('generates correct DID id', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc.id).toBe('did:web:example.com');
  });

  it('generates correct DID id with path', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      path: 'agents/claude-001',
      publicKey: mockPublicKey,
    });

    expect(doc.id).toBe('did:web:example.com:agents:claude-001');
  });

  it('includes verificationMethod with correct type', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc.verificationMethod).toHaveLength(1);
    expect(doc.verificationMethod[0].type).toBe('Ed25519VerificationKey2020');
  });

  it('verificationMethod has correct structure', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    const vm = doc.verificationMethod[0];
    expect(vm).toHaveProperty('id');
    expect(vm).toHaveProperty('type');
    expect(vm).toHaveProperty('controller');
    expect(vm).toHaveProperty('publicKeyMultibase');
    expect(vm.id).toBe('did:web:example.com#key-1');
  });

  it('publicKeyMultibase starts with z', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    const vm = doc.verificationMethod[0];
    expect(vm.publicKeyMultibase).toMatch(/^z/);
  });

  it('includes authentication array with verification method reference', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc.authentication).toHaveLength(1);
    expect(doc.authentication[0]).toBe('did:web:example.com#key-1');
  });

  it('includes assertionMethod array with verification method reference', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc.assertionMethod).toHaveLength(1);
    expect(doc.assertionMethod[0]).toBe('did:web:example.com#key-1');
  });

  it('includes controller when provided', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
      controller: 'did:web:guardian.example.com',
    });

    expect(doc.controller).toBe('did:web:guardian.example.com');
  });

  it('does not include controller when not provided', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc.controller).toBeUndefined();
  });

  it('verification method controller uses provided controller', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
      controller: 'did:web:guardian.example.com',
    });

    expect(doc.verificationMethod[0].controller).toBe('did:web:guardian.example.com');
  });

  it('verification method controller defaults to DID when not provided', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc.verificationMethod[0].controller).toBe('did:web:example.com');
  });

  it('includes service endpoints when provided', () => {
    const serviceEndpoints = [
      {
        id: 'did:web:example.com#agent-service',
        type: 'AgentService',
        serviceEndpoint: 'https://example.com/agent',
      },
    ];

    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
      serviceEndpoints,
    });

    expect(doc.service).toEqual(serviceEndpoints);
  });

  it('does not include service when empty array provided', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
      serviceEndpoints: [],
    });

    expect(doc.service).toBeUndefined();
  });

  it('does not include service when not provided', () => {
    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
    });

    expect(doc.service).toBeUndefined();
  });

  it('includes multiple service endpoints', () => {
    const serviceEndpoints = [
      {
        id: 'did:web:example.com#service-1',
        type: 'AgentService',
        serviceEndpoint: 'https://example.com/agent',
      },
      {
        id: 'did:web:example.com#service-2',
        type: 'MessagingService',
        serviceEndpoint: 'https://example.com/messages',
      },
    ];

    const doc = createDIDDocument({
      domain: 'example.com',
      publicKey: mockPublicKey,
      serviceEndpoints,
    });

    expect(doc.service).toHaveLength(2);
    expect(doc.service).toEqual(serviceEndpoints);
  });
});
