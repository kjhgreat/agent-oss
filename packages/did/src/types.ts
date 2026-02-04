/**
 * Type definitions for DID package
 */

export interface DIDOptions {
  domain: string; // e.g., "agent.example.com"
  path?: string; // e.g., "agents/claude-001"
  publicKey: string; // base64url encoded Ed25519 public key
  controller?: string; // Guardian's DID (optional)
  serviceEndpoints?: ServiceEndpoint[];
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface VerificationMethod {
  id: string;
  type: 'Ed25519VerificationKey2020';
  controller: string;
  publicKeyMultibase: string; // z + base58btc encoded
}

export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  controller?: string;
  service?: ServiceEndpoint[];
}

export interface DIDResolutionResult {
  didDocument: DIDDocument | null;
  didResolutionMetadata: {
    error?: string;
    contentType?: string;
  };
  didDocumentMetadata: {
    created?: string;
    updated?: string;
  };
}
