/**
 * HTTP request signing and verification
 */

import { sha256 } from '@noble/hashes/sha256';
import { signMessage } from './sign.js';
import type { SignOptions, SignableRequest, SignedHeaders, VerificationResult } from './types.js';
import { verifySignature } from './verify.js';

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Create canonical string for signing
 * Format: ${method}\n${url}\n${timestamp}\n${bodyHash}
 */
function createCanonicalString(request: SignableRequest): string {
  const method = request.method.toUpperCase();
  const url = request.url;
  const timestamp = request.timestamp ?? Date.now();

  // Hash the body if present
  let bodyHash = '';
  if (request.body !== undefined && request.body !== null) {
    const bodyBytes = new TextEncoder().encode(request.body);
    const hash = sha256(bodyBytes);
    bodyHash = base64urlEncode(hash);
  }

  return `${method}\n${url}\n${timestamp}\n${bodyHash}`;
}

/**
 * Sign an HTTP request
 */
export async function signRequest(
  request: SignableRequest,
  options: SignOptions
): Promise<SignedHeaders> {
  const timestamp = request.timestamp ?? Date.now();
  const canonical = createCanonicalString({ ...request, timestamp });
  const message = new TextEncoder().encode(canonical);

  const signature = await signMessage(message, options.privateKey);

  return {
    'X-Agent-Signature': base64urlEncode(signature),
    'X-Agent-DID': options.did,
    'X-Agent-Timestamp': timestamp.toString(),
  };
}

/**
 * Verify a signed HTTP request
 */
export async function verifyRequest(
  headers: Record<string, string>,
  publicKey: Uint8Array,
  body?: string,
  toleranceMs: number = DEFAULT_TOLERANCE_MS
): Promise<VerificationResult> {
  try {
    // Extract required headers (case-insensitive)
    const signature = getHeader(headers, 'X-Agent-Signature');
    const timestamp = getHeader(headers, 'X-Agent-Timestamp');

    if (!signature) {
      return { valid: false, error: 'Missing X-Agent-Signature header' };
    }

    if (!timestamp) {
      return { valid: false, error: 'Missing X-Agent-Timestamp header' };
    }

    // Parse timestamp
    const timestampNum = Number.parseInt(timestamp, 10);
    if (Number.isNaN(timestampNum)) {
      return { valid: false, error: 'Invalid timestamp format' };
    }

    // Check timestamp tolerance
    const now = Date.now();
    const diff = Math.abs(now - timestampNum);
    if (diff > toleranceMs) {
      return {
        valid: false,
        error: 'Timestamp outside tolerance window',
        expiredTimestamp: true,
      };
    }

    // Reconstruct the request for verification
    // We need method and url from the headers as well
    const method = getHeader(headers, 'X-Agent-Method') ?? 'POST';
    const url = getHeader(headers, 'X-Agent-URL') ?? '/';

    const request: SignableRequest = {
      method,
      url,
      body,
      timestamp: timestampNum,
    };

    const canonical = createCanonicalString(request);
    const message = new TextEncoder().encode(canonical);
    const signatureBytes = base64urlDecode(signature);

    const valid = await verifySignature(message, signatureBytes, publicKey);

    if (!valid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get header value (case-insensitive)
 */
function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return undefined;
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
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

  const padding = base64.length % 4;
  if (padding === 2) {
    base64 += '==';
  } else if (padding === 3) {
    base64 += '=';
  }

  return new Uint8Array(Buffer.from(base64, 'base64'));
}
