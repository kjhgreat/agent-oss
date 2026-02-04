/**
 * TypeScript type definitions for @antfarm/crypto
 */

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface SignableRequest {
  method: string;
  url: string;
  body?: string;
  timestamp?: number;
}

export interface SignedHeaders {
  'X-Agent-Signature': string;
  'X-Agent-DID': string;
  'X-Agent-Timestamp': string;
}

export interface SignOptions {
  privateKey: Uint8Array;
  did: string;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  expiredTimestamp?: boolean;
}
