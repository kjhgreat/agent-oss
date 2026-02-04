/**
 * DID document creation and management
 */

import { generateDID } from './generate.js';
import type { DIDDocument, DIDOptions, VerificationMethod } from './types.js';
import { base64urlToBytes, publicKeyToMultibase } from './utils.js';

/**
 * Create a DID document from options
 *
 * @param options - DID creation options
 * @returns Complete DID document
 *
 * @example
 * const doc = createDIDDocument({
 *   domain: "example.com",
 *   path: "agents/claude-001",
 *   publicKey: "base64url-encoded-key",
 *   controller: "did:web:guardian.example.com"
 * });
 */
export function createDIDDocument(options: DIDOptions): DIDDocument {
  const { domain, path, publicKey, controller, serviceEndpoints } = options;

  // Generate DID
  const did = generateDID(domain, path);

  // Convert public key from base64url to bytes
  const publicKeyBytes = base64urlToBytes(publicKey);

  // Create verification method
  const verificationMethodId = `${did}#key-1`;
  const verificationMethod: VerificationMethod = {
    id: verificationMethodId,
    type: 'Ed25519VerificationKey2020',
    controller: controller || did,
    publicKeyMultibase: publicKeyToMultibase(publicKeyBytes),
  };

  // Build DID document
  const document: DIDDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: did,
    verificationMethod: [verificationMethod],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
  };

  // Add optional controller
  if (controller) {
    document.controller = controller;
  }

  // Add optional service endpoints
  if (serviceEndpoints && serviceEndpoints.length > 0) {
    document.service = serviceEndpoints;
  }

  return document;
}
