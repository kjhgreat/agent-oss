import { describe, expect, it } from 'vitest';
import {
  base64urlToBytes,
  bytesToBase64url,
  extractPublicKey,
  isValidDID,
  multibaseToPublicKey,
  publicKeyToMultibase,
} from '../utils.js';

describe('isValidDID', () => {
  it('returns true for valid did:web', () => {
    expect(isValidDID('did:web:example.com')).toBe(true);
  });

  it('returns true for did:web with path', () => {
    expect(isValidDID('did:web:example.com:path:to:resource')).toBe(true);
  });

  it('returns true for did:key', () => {
    expect(isValidDID('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')).toBe(true);
  });

  it('returns true for valid DID with various characters', () => {
    expect(isValidDID('did:example:123456789abcdefghi')).toBe(true);
    expect(isValidDID('did:web:example.com:user_123')).toBe(true);
    expect(isValidDID('did:web:example.com:user-456')).toBe(true);
    expect(isValidDID('did:web:example.com:50%25')).toBe(true);
  });

  it('returns false for invalid formats', () => {
    expect(isValidDID('not-a-did')).toBe(false);
    expect(isValidDID('did:')).toBe(false);
    expect(isValidDID('did:web')).toBe(false);
    expect(isValidDID('web:example.com')).toBe(false);
    expect(isValidDID('did:WEB:example.com')).toBe(false); // uppercase method not allowed
  });

  it('returns false for empty string', () => {
    expect(isValidDID('')).toBe(false);
  });

  it('returns false for DID with invalid characters', () => {
    expect(isValidDID('did:web:example.com#fragment')).toBe(false); // # not in identifier
    expect(isValidDID('did:web:example com')).toBe(false); // space not allowed
  });

  it('returns false for malformed DID', () => {
    expect(isValidDID('did:web:')).toBe(false);
    expect(isValidDID('did::example.com')).toBe(false);
  });
});

describe('publicKeyToMultibase', () => {
  it('encodes correctly with z prefix', () => {
    // 32 bytes of test data
    const publicKey = new Uint8Array(32).fill(1);
    const multibase = publicKeyToMultibase(publicKey);

    expect(multibase).toMatch(/^z/);
    expect(multibase.length).toBeGreaterThan(1);
  });

  it('produces base58btc encoding after z prefix', () => {
    const publicKey = new Uint8Array(32).fill(0);
    const multibase = publicKeyToMultibase(publicKey);

    // Should only contain valid base58 characters after 'z'
    const base58 = multibase.slice(1);
    expect(base58).toMatch(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);
  });

  it('handles different public keys differently', () => {
    const key1 = new Uint8Array(32).fill(1);
    const key2 = new Uint8Array(32).fill(2);

    const multibase1 = publicKeyToMultibase(key1);
    const multibase2 = publicKeyToMultibase(key2);

    expect(multibase1).not.toBe(multibase2);
  });

  it('includes Ed25519 multicodec prefix (0xed01)', () => {
    const publicKey = new Uint8Array(32).fill(1);
    const multibase = publicKeyToMultibase(publicKey);

    // Decode and verify it can be decoded back
    const decoded = multibaseToPublicKey(multibase);
    expect(decoded).toEqual(publicKey);
  });

  it('produces consistent output for same input', () => {
    const publicKey = new Uint8Array(32).fill(42);
    const multibase1 = publicKeyToMultibase(publicKey);
    const multibase2 = publicKeyToMultibase(publicKey);

    expect(multibase1).toBe(multibase2);
  });
});

describe('multibaseToPublicKey', () => {
  it('decodes correctly from multibase format', () => {
    const originalKey = new Uint8Array(32).fill(1);
    const multibase = publicKeyToMultibase(originalKey);
    const decodedKey = multibaseToPublicKey(multibase);

    expect(decodedKey).toEqual(originalKey);
  });

  it('throws error for invalid multibase format without z prefix', () => {
    expect(() => multibaseToPublicKey('invalid')).toThrow(
      'Invalid multibase format: must start with z'
    );
  });

  it('throws error for invalid Ed25519 prefix', () => {
    // Create a multibase string without proper Ed25519 prefix
    expect(() => multibaseToPublicKey('z123')).toThrow('Invalid Ed25519 multicodec prefix');
  });

  it('round-trips encoding and decoding', () => {
    const keys = [
      new Uint8Array(32).fill(0),
      new Uint8Array(32).fill(255),
      new Uint8Array(32).map((_, i) => i),
      new Uint8Array(32).map((_, i) => 255 - i),
    ];

    for (const key of keys) {
      const multibase = publicKeyToMultibase(key);
      const decoded = multibaseToPublicKey(multibase);
      expect(decoded).toEqual(key);
    }
  });

  it('handles base58 decoding correctly', () => {
    const publicKey = new Uint8Array([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
      27, 28, 29, 30, 31, 32,
    ]);

    const multibase = publicKeyToMultibase(publicKey);
    const decoded = multibaseToPublicKey(multibase);

    expect(decoded).toEqual(publicKey);
  });
});

describe('extractPublicKey', () => {
  it('extracts key from DID document', () => {
    const publicKey = new Uint8Array(32).fill(42);
    const multibase = publicKeyToMultibase(publicKey);

    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#key-1',
          type: 'Ed25519VerificationKey2020' as const,
          controller: 'did:web:example.com',
          publicKeyMultibase: multibase,
        },
      ],
      authentication: ['did:web:example.com#key-1'],
      assertionMethod: ['did:web:example.com#key-1'],
    };

    const extracted = extractPublicKey(didDocument);
    expect(extracted).toEqual(publicKey);
  });

  it('throws error when no verification methods', () => {
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      verificationMethod: [],
      authentication: [],
      assertionMethod: [],
    };

    expect(() => extractPublicKey(didDocument)).toThrow(
      'No verification methods found in DID document'
    );
  });

  it('throws error when verificationMethod is undefined', () => {
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      authentication: [],
      assertionMethod: [],
      // biome-ignore lint/suspicious/noExplicitAny: Test case requires incomplete DID document
    } as any;

    expect(() => extractPublicKey(didDocument)).toThrow(
      'No verification methods found in DID document'
    );
  });

  it('extracts first verification method when multiple exist', () => {
    const publicKey1 = new Uint8Array(32).fill(1);
    const publicKey2 = new Uint8Array(32).fill(2);

    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#key-1',
          type: 'Ed25519VerificationKey2020' as const,
          controller: 'did:web:example.com',
          publicKeyMultibase: publicKeyToMultibase(publicKey1),
        },
        {
          id: 'did:web:example.com#key-2',
          type: 'Ed25519VerificationKey2020' as const,
          controller: 'did:web:example.com',
          publicKeyMultibase: publicKeyToMultibase(publicKey2),
        },
      ],
      authentication: ['did:web:example.com#key-1'],
      assertionMethod: ['did:web:example.com#key-1'],
    };

    const extracted = extractPublicKey(didDocument);
    expect(extracted).toEqual(publicKey1);
  });
});

describe('base64urlToBytes', () => {
  it('decodes valid base64url string', () => {
    // "hello" in base64url
    const base64url = 'aGVsbG8';
    const bytes = base64urlToBytes(base64url);
    const text = new TextDecoder().decode(bytes);

    expect(text).toBe('hello');
  });

  it('handles base64url with - and _', () => {
    // Create bytes that will produce - and _ in base64url
    const original = new Uint8Array([0xfb, 0xff, 0xbf]);
    const base64url = bytesToBase64url(original);
    const decoded = base64urlToBytes(base64url);

    expect(decoded).toEqual(original);
  });

  it('handles strings without padding', () => {
    const base64url = 'YWJj'; // "abc" without padding
    const bytes = base64urlToBytes(base64url);
    const text = new TextDecoder().decode(bytes);

    expect(text).toBe('abc');
  });

  it('handles strings requiring padding', () => {
    const base64url = 'YQ'; // "a" requires == padding
    const bytes = base64urlToBytes(base64url);
    const text = new TextDecoder().decode(bytes);

    expect(text).toBe('a');
  });

  it('round-trips with bytesToBase64url', () => {
    const testCases = [
      new Uint8Array([0, 1, 2, 3, 4, 5]),
      new Uint8Array(32).fill(255),
      new Uint8Array([0xfb, 0xff, 0xbf]),
    ];

    for (const original of testCases) {
      const encoded = bytesToBase64url(original);
      const decoded = base64urlToBytes(encoded);
      expect(decoded).toEqual(original);
    }
  });

  it('decodes empty string to empty array', () => {
    const bytes = base64urlToBytes('');
    expect(bytes).toEqual(new Uint8Array(0));
  });
});

describe('bytesToBase64url', () => {
  it('encodes bytes to base64url', () => {
    const text = 'hello';
    const bytes = new TextEncoder().encode(text);
    const base64url = bytesToBase64url(bytes);

    expect(base64url).toBe('aGVsbG8');
  });

  it('does not include padding', () => {
    const bytes = new TextEncoder().encode('a'); // Would need == padding
    const base64url = bytesToBase64url(bytes);

    expect(base64url).not.toContain('=');
    expect(base64url).toBe('YQ');
  });

  it('uses - instead of +', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf]); // Contains char that would be + in base64
    const base64url = bytesToBase64url(bytes);

    expect(base64url).not.toContain('+');
    expect(base64url).toContain('-');
  });

  it('uses _ instead of /', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf]); // Contains char that would be / in base64
    const base64url = bytesToBase64url(bytes);

    expect(base64url).not.toContain('/');
    expect(base64url).toContain('_');
  });

  it('encodes empty array to empty string', () => {
    const base64url = bytesToBase64url(new Uint8Array(0));
    expect(base64url).toBe('');
  });

  it('produces URL-safe output', () => {
    const bytes = new Uint8Array(100).map((_, i) => i);
    const base64url = bytesToBase64url(bytes);

    // Should only contain base64url characters
    expect(base64url).toMatch(/^[A-Za-z0-9_-]*$/);
  });
});
