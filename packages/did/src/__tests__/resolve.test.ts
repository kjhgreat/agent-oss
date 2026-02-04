import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWellKnownUrl, resolveDID } from '../resolve.js';

describe('getWellKnownUrl', () => {
  it('converts did:web:example.com to https://example.com/.well-known/did.json', () => {
    const url = getWellKnownUrl('did:web:example.com');
    expect(url).toBe('https://example.com/.well-known/did.json');
  });

  it('converts did:web:example.com:path:to to https://example.com/path/to/did.json', () => {
    const url = getWellKnownUrl('did:web:example.com:path:to');
    expect(url).toBe('https://example.com/path/to/did.json');
  });

  it('converts did:web with subdomain', () => {
    const url = getWellKnownUrl('did:web:api.example.com');
    expect(url).toBe('https://api.example.com/.well-known/did.json');
  });

  it('converts did:web with multiple path segments', () => {
    const url = getWellKnownUrl('did:web:example.com:agents:claude:v1');
    expect(url).toBe('https://example.com/agents/claude/v1/did.json');
  });

  it('throws error for non did:web DIDs', () => {
    expect(() =>
      getWellKnownUrl('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')
    ).toThrow('Only did:web method is supported');
  });

  it('handles port numbers as path segments', () => {
    // Note: In DID:web, ports should be encoded (e.g., localhost%3A3000)
    // This test verifies current implementation treats it as a path
    const url = getWellKnownUrl('did:web:localhost:3000');
    expect(url).toBe('https://localhost/3000/did.json');
  });

  it('handles port numbers with additional path', () => {
    // Note: In DID:web, ports should be encoded (e.g., localhost%3A3000)
    // This test verifies current implementation treats it as a path
    const url = getWellKnownUrl('did:web:localhost:3000:agents:test');
    expect(url).toBe('https://localhost/3000/agents/test/did.json');
  });
});

describe('resolveDID', () => {
  const mockDIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: 'did:web:example.com',
    verificationMethod: [
      {
        id: 'did:web:example.com#key-1',
        type: 'Ed25519VerificationKey2020',
        controller: 'did:web:example.com',
        publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      },
    ],
    authentication: ['did:web:example.com#key-1'],
    assertionMethod: ['did:web:example.com#key-1'],
  };

  beforeEach(() => {
    // Mock global fetch
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns error for invalid DID format', async () => {
    const result = await resolveDID('invalid-did');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDid');
  });

  it('returns error for non did:web method', async () => {
    const result = await resolveDID('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('methodNotSupported');
  });

  it('successfully resolves DID document', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDIDDocument,
      headers: new Headers({
        'content-type': 'application/json',
        'last-modified': 'Wed, 15 Jan 2025 12:00:00 GMT',
      }),
    } as Response);

    const result = await resolveDID('did:web:example.com');

    expect(result.didDocument).toEqual(mockDIDDocument);
    expect(result.didResolutionMetadata.error).toBeUndefined();
    expect(result.didResolutionMetadata.contentType).toBe('application/json');
    expect(result.didDocumentMetadata.updated).toBe('Wed, 15 Jan 2025 12:00:00 GMT');
  });

  it('calls correct well-known URL', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDIDDocument,
      headers: new Headers(),
    } as Response);

    await resolveDID('did:web:example.com');

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/.well-known/did.json');
  });

  it('returns notFound error for 404 response', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as Response);

    const result = await resolveDID('did:web:example.com');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('notFound');
  });

  it('returns internalError for non-404 HTTP errors', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers(),
    } as Response);

    const result = await resolveDID('did:web:example.com');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('internalError');
  });

  it('returns invalidDidDocument error when DID mismatch', async () => {
    const mismatchedDoc = { ...mockDIDDocument, id: 'did:web:different.com' };
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mismatchedDoc,
      headers: new Headers(),
    } as Response);

    const result = await resolveDID('did:web:example.com');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('invalidDidDocument');
  });

  it('returns internalError for fetch exceptions', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await resolveDID('did:web:example.com');

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('internalError');
  });

  it('handles missing content-type header', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDIDDocument,
      headers: new Headers(),
    } as Response);

    const result = await resolveDID('did:web:example.com');

    expect(result.didDocument).toEqual(mockDIDDocument);
    expect(result.didResolutionMetadata.contentType).toBeUndefined();
  });

  it('handles missing last-modified header', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDIDDocument,
      headers: new Headers({ 'content-type': 'application/json' }),
    } as Response);

    const result = await resolveDID('did:web:example.com');

    expect(result.didDocument).toEqual(mockDIDDocument);
    expect(result.didDocumentMetadata.updated).toBeUndefined();
  });

  it('resolves DID with path', async () => {
    const docWithPath = { ...mockDIDDocument, id: 'did:web:example.com:agents:claude' };
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => docWithPath,
      headers: new Headers(),
    } as Response);

    const result = await resolveDID('did:web:example.com:agents:claude');

    expect(result.didDocument).toEqual(docWithPath);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/agents/claude/did.json');
  });
});
