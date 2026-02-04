/**
 * Signature verification
 */

import * as ed25519 from '@noble/ed25519';

/**
 * Verify an Ed25519 signature
 */
export async function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  try {
    return await ed25519.verifyAsync(signature, message, publicKey);
  } catch (error) {
    return false;
  }
}
