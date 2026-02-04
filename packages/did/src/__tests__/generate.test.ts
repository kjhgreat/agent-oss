import { describe, expect, it } from 'vitest';
import { generateDID } from '../generate.js';

describe('generateDID', () => {
  it('returns valid did:web format', () => {
    const did = generateDID('example.com');
    expect(did).toBe('did:web:example.com');
    expect(did).toMatch(/^did:web:/);
  });

  it('generates DID with path includes path segments separated by colons', () => {
    const did = generateDID('example.com', 'agents/claude-001');
    expect(did).toBe('did:web:example.com:agents:claude-001');
  });

  it('generates DID without path uses domain only', () => {
    const did = generateDID('example.com');
    expect(did).toBe('did:web:example.com');
    expect(did).not.toContain(':agents');
  });

  it('handles domains with subdomains', () => {
    const did = generateDID('api.agents.example.com');
    expect(did).toBe('did:web:api.agents.example.com');
  });

  it('removes https:// protocol from domain', () => {
    const did = generateDID('https://example.com');
    expect(did).toBe('did:web:example.com');
  });

  it('removes http:// protocol from domain', () => {
    const did = generateDID('http://example.com');
    expect(did).toBe('did:web:example.com');
  });

  it('handles multiple path segments', () => {
    const did = generateDID('example.com', 'path/to/agent/resource');
    expect(did).toBe('did:web:example.com:path:to:agent:resource');
  });

  it('handles path with leading slash', () => {
    const did = generateDID('example.com', '/agents/claude');
    expect(did).toBe('did:web:example.com:agents:claude');
  });

  it('handles path with trailing slash', () => {
    const did = generateDID('example.com', 'agents/claude/');
    expect(did).toBe('did:web:example.com:agents:claude');
  });

  it('handles empty path string', () => {
    const did = generateDID('example.com', '');
    expect(did).toBe('did:web:example.com');
  });

  it('handles path with multiple consecutive slashes', () => {
    const did = generateDID('example.com', 'agents//claude');
    expect(did).toBe('did:web:example.com:agents:claude');
  });
});
