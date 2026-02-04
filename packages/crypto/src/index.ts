/**
 * @antfarm/crypto
 *
 * Cryptographic primitives for agent identity and verification.
 * Built on @noble/ed25519 and @noble/hashes for audited, secure implementations.
 */

// Export types
export type {
  KeyPair,
  SignableRequest,
  SignedHeaders,
  SignOptions,
  VerificationResult,
} from './types.js';

// Export key management functions
export {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
} from './keys.js';

// Export signing functions
export { signMessage } from './sign.js';

// Export verification functions
export { verifySignature } from './verify.js';

// Export request signing/verification functions
export { signRequest, verifyRequest } from './request.js';
