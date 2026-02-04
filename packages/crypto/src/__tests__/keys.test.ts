/**
 * Tests for key generation and management
 */

import { describe, expect, it } from 'vitest';
import {
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  importPrivateKey,
  importPublicKey,
} from '../keys.js';

describe('keys', () => {
  describe('generateKeyPair', () => {
    it('should return valid keypair with 32-byte keys', async () => {
      const keypair = await generateKeyPair();

      expect(keypair).toBeDefined();
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keypair.publicKey.length).toBe(32);
      expect(keypair.privateKey.length).toBe(32);
    });

    it('should generate different keypairs on each call', async () => {
      const keypair1 = await generateKeyPair();
      const keypair2 = await generateKeyPair();

      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey);
      expect(keypair1.privateKey).not.toEqual(keypair2.privateKey);
    });
  });

  describe('exportPublicKey', () => {
    it('should return base64url encoded string', async () => {
      const keypair = await generateKeyPair();
      const exported = exportPublicKey(keypair.publicKey);

      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);
      // base64url should not contain +, /, or =
      expect(exported).not.toMatch(/[+/=]/);
    });

    it('should produce consistent output for same input', async () => {
      const keypair = await generateKeyPair();
      const exported1 = exportPublicKey(keypair.publicKey);
      const exported2 = exportPublicKey(keypair.publicKey);

      expect(exported1).toBe(exported2);
    });
  });

  describe('exportPrivateKey', () => {
    it('should return base64url encoded string', async () => {
      const keypair = await generateKeyPair();
      const exported = exportPrivateKey(keypair.privateKey);

      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);
      // base64url should not contain +, /, or =
      expect(exported).not.toMatch(/[+/=]/);
    });

    it('should produce consistent output for same input', async () => {
      const keypair = await generateKeyPair();
      const exported1 = exportPrivateKey(keypair.privateKey);
      const exported2 = exportPrivateKey(keypair.privateKey);

      expect(exported1).toBe(exported2);
    });
  });

  describe('importPublicKey', () => {
    it('should correctly decode base64url', async () => {
      const keypair = await generateKeyPair();
      const exported = exportPublicKey(keypair.publicKey);
      const imported = importPublicKey(exported);

      expect(imported).toBeInstanceOf(Uint8Array);
      expect(imported.length).toBe(32);
    });

    it('should handle base64url without padding', () => {
      // Example base64url encoded 32-byte array
      const encoded = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const imported = importPublicKey(encoded);

      expect(imported).toBeInstanceOf(Uint8Array);
      expect(imported.length).toBe(32);
    });
  });

  describe('importPrivateKey', () => {
    it('should correctly decode base64url', async () => {
      const keypair = await generateKeyPair();
      const exported = exportPrivateKey(keypair.privateKey);
      const imported = importPrivateKey(exported);

      expect(imported).toBeInstanceOf(Uint8Array);
      expect(imported.length).toBe(32);
    });

    it('should handle base64url without padding', () => {
      // Example base64url encoded 32-byte array
      const encoded = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const imported = importPrivateKey(encoded);

      expect(imported).toBeInstanceOf(Uint8Array);
      expect(imported.length).toBe(32);
    });
  });

  describe('round-trip encoding', () => {
    it('should preserve public key bytes through export then import', async () => {
      const keypair = await generateKeyPair();
      const exported = exportPublicKey(keypair.publicKey);
      const imported = importPublicKey(exported);

      expect(imported).toEqual(keypair.publicKey);
    });

    it('should preserve private key bytes through export then import', async () => {
      const keypair = await generateKeyPair();
      const exported = exportPrivateKey(keypair.privateKey);
      const imported = importPrivateKey(exported);

      expect(imported).toEqual(keypair.privateKey);
    });
  });
});
