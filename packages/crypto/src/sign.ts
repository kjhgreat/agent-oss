/**
 * Message signing
 */

import * as ed25519 from '@noble/ed25519';

/**
 * Sign a message using Ed25519
 */
export async function signMessage(
  message: Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  const signature = await ed25519.signAsync(message, privateKey);
  return signature;
}
