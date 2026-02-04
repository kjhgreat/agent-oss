/**
 * DID resolution functions
 */

import type { DIDDocument, DIDResolutionResult } from './types.js';
import { isValidDID } from './utils.js';

/**
 * Convert a did:web identifier to a well-known URL
 *
 * Resolution rules:
 * - did:web:example.com → https://example.com/.well-known/did.json
 * - did:web:example.com:path:to:resource → https://example.com/path/to/resource/did.json
 *
 * @param did - DID to convert
 * @returns Well-known URL
 */
export function getWellKnownUrl(did: string): string {
  if (!did.startsWith('did:web:')) {
    throw new Error('Only did:web method is supported');
  }

  // Remove did:web: prefix
  const identifier = did.substring(8);

  // Split into parts
  const parts = identifier.split(':');
  const domain = parts[0];
  const pathParts = parts.slice(1);

  // Build URL
  if (pathParts.length === 0) {
    // Root domain: use .well-known
    return `https://${domain}/.well-known/did.json`;
  }
  // Path: convert colons to slashes
  const path = pathParts.join('/');
  return `https://${domain}/${path}/did.json`;
}

/**
 * Resolve a DID to its DID document
 *
 * @param did - DID to resolve
 * @returns Resolution result with DID document and metadata
 *
 * @example
 * const result = await resolveDID("did:web:example.com");
 * if (result.didDocument) {
 *   console.log("Resolved:", result.didDocument.id);
 * }
 */
export async function resolveDID(did: string): Promise<DIDResolutionResult> {
  // Validate DID format
  if (!isValidDID(did)) {
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: 'invalidDid',
      },
      didDocumentMetadata: {},
    };
  }

  // Only support did:web
  if (!did.startsWith('did:web:')) {
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: 'methodNotSupported',
      },
      didDocumentMetadata: {},
    };
  }

  try {
    // Get well-known URL
    const url = getWellKnownUrl(did);

    // Fetch DID document (requires fetch API or polyfill)
    const response = await globalThis.fetch(url);

    if (!response.ok) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: response.status === 404 ? 'notFound' : 'internalError',
        },
        didDocumentMetadata: {},
      };
    }

    // Parse DID document
    const didDocument = (await response.json()) as DIDDocument;

    // Verify DID matches
    if (didDocument.id !== did) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: 'invalidDidDocument',
        },
        didDocumentMetadata: {},
      };
    }

    // Extract metadata from headers
    const contentType = response.headers.get('content-type') || undefined;
    const lastModified = response.headers.get('last-modified') || undefined;

    return {
      didDocument,
      didResolutionMetadata: {
        contentType,
      },
      didDocumentMetadata: {
        updated: lastModified,
      },
    };
  } catch (error) {
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: 'internalError',
      },
      didDocumentMetadata: {},
    };
  }
}
