/**
 * @antfarm/did
 *
 * Decentralized Identifier (DID) implementation for agent identity.
 * Implements did:web method with Ed25519 keys.
 */

// Export types
export type {
  DIDOptions,
  ServiceEndpoint,
  VerificationMethod,
  DIDDocument,
  DIDResolutionResult,
} from './types.js';

// Export generation functions
export { generateDID } from './generate.js';

// Export document functions
export { createDIDDocument } from './document.js';

// Export resolution functions
export { resolveDID, getWellKnownUrl } from './resolve.js';

// Export utility functions
export {
  extractPublicKey,
  isValidDID,
  publicKeyToMultibase,
  multibaseToPublicKey,
  base64urlToBytes,
  bytesToBase64url,
} from './utils.js';
