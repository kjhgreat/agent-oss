/**
 * Utility functions for DID operations
 */

import type { DIDDocument } from './types.js';

// Base58 alphabet (Bitcoin/IPFS variant)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes to base58
 */
function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  // Convert to big integer
  let num = 0n;
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }

  // Convert to base58
  let result = '';
  while (num > 0n) {
    const remainder = Number(num % 58n);
    result = BASE58_ALPHABET[remainder] + result;
    num = num / 58n;
  }

  // Add leading zeros
  for (const byte of bytes) {
    if (byte === 0) {
      result = BASE58_ALPHABET[0] + result;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Decode base58 to bytes
 */
function decodeBase58(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);

  // Count leading zeros
  let leadingZeros = 0;
  for (const char of str) {
    if (char === BASE58_ALPHABET[0]) {
      leadingZeros++;
    } else {
      break;
    }
  }

  // Convert from base58 to big integer
  let num = 0n;
  for (const char of str) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    num = num * 58n + BigInt(digit);
  }

  // Convert to bytes
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }

  // Add leading zeros
  for (let i = 0; i < leadingZeros; i++) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}

/**
 * Convert public key to multibase format (z + base58btc)
 */
export function publicKeyToMultibase(publicKey: Uint8Array): string {
  // Ed25519 public key multicodec prefix: 0xed01
  const prefixed = new Uint8Array(publicKey.length + 2);
  prefixed[0] = 0xed;
  prefixed[1] = 0x01;
  prefixed.set(publicKey, 2);

  // Encode with base58btc and add 'z' prefix for multibase
  return `z${encodeBase58(prefixed)}`;
}

/**
 * Convert multibase format to public key
 */
export function multibaseToPublicKey(multibase: string): Uint8Array {
  if (!multibase.startsWith('z')) {
    throw new Error('Invalid multibase format: must start with z');
  }

  const decoded = decodeBase58(multibase.slice(1));

  // Verify Ed25519 multicodec prefix
  if (decoded.length < 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('Invalid Ed25519 multicodec prefix');
  }

  // Return public key without prefix
  return decoded.slice(2);
}

/**
 * Extract public key from DID document
 */
export function extractPublicKey(didDocument: DIDDocument): Uint8Array {
  if (!didDocument.verificationMethod || didDocument.verificationMethod.length === 0) {
    throw new Error('No verification methods found in DID document');
  }

  const verificationMethod = didDocument.verificationMethod[0];
  return multibaseToPublicKey(verificationMethod.publicKeyMultibase);
}

/**
 * Validate DID format
 */
export function isValidDID(did: string): boolean {
  // DID format: did:method:identifier
  const didPattern = /^did:[a-z0-9]+:[a-zA-Z0-9._:%-]+$/;
  return didPattern.test(did);
}

/**
 * Decode base64url to Uint8Array
 */
export function base64urlToBytes(base64url: string): Uint8Array {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = base64.length % 4;
  const padded = padding ? base64 + '='.repeat(4 - padding) : base64;

  // Decode base64 using Buffer (Node.js) or atob (browser)
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }
  if (typeof atob !== 'undefined') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('No base64 decoder available');
}

/**
 * Encode Uint8Array to base64url
 */
export function bytesToBase64url(bytes: Uint8Array): string {
  // Encode to base64 using Buffer (Node.js) or btoa (browser)
  let base64: string;
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  } else if (typeof btoa !== 'undefined') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    base64 = btoa(binary);
  } else {
    throw new Error('No base64 encoder available');
  }

  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
