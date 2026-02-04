/**
 * DID generation functions
 */

/**
 * Generate a did:web identifier from domain and optional path
 *
 * @param domain - Domain name (e.g., "example.com")
 * @param path - Optional path segments (e.g., "agents/claude-001")
 * @returns DID string (e.g., "did:web:example.com" or "did:web:example.com:agents:claude-001")
 *
 * @example
 * generateDID("example.com") // "did:web:example.com"
 * generateDID("example.com", "agents/claude-001") // "did:web:example.com:agents:claude-001"
 */
export function generateDID(domain: string, path?: string): string {
  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '');

  // Build DID
  let did = `did:web:${cleanDomain}`;

  if (path) {
    // Convert path separators to colons
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      did += `:${pathSegments.join(':')}`;
    }
  }

  return did;
}
