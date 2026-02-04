/**
 * Key generation and management
 */

import * as ed25519 from '@noble/ed25519';
import type { KeyPair } from './types.js';

/**
 * Generate a new Ed25519 key pair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Export public key to base64url encoding (no padding)
 */
export function exportPublicKey(publicKey: Uint8Array): string {
  return base64urlEncode(publicKey);
}

/**
 * Export private key to base64url encoding (no padding)
 */
export function exportPrivateKey(privateKey: Uint8Array): string {
  return base64urlEncode(privateKey);
}

/**
 * Import public key from base64url encoding
 */
export function importPublicKey(encoded: string): Uint8Array {
  return base64urlDecode(encoded);
}

/**
 * Import private key from base64url encoding
 */
export function importPrivateKey(encoded: string): Uint8Array {
  return base64urlDecode(encoded);
}

/**
 * Base64url encode (no padding)
 */
function base64urlEncode(data: Uint8Array): string {
  const base64 = Buffer.from(data).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64url decode (handles missing padding)
 */
function base64urlDecode(encoded: string): Uint8Array {
  // Convert base64url to base64
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = base64.length % 4;
  if (padding === 2) {
    base64 += '==';
  } else if (padding === 3) {
    base64 += '=';
  }

  return new Uint8Array(Buffer.from(base64, 'base64'));
}
