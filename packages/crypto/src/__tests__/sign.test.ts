/**
 * Tests for message signing
 */

import { describe, expect, it } from 'vitest';
import { generateKeyPair } from '../keys.js';
import { signMessage } from '../sign.js';

describe('sign', () => {
  describe('signMessage', () => {
    it('should return 64-byte signature', async () => {
      const keypair = await generateKeyPair();
      const message = new TextEncoder().encode('test message');
      const signature = await signMessage(message, keypair.privateKey);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should produce different signatures for different messages', async () => {
      const keypair = await generateKeyPair();
      const message1 = new TextEncoder().encode('message 1');
      const message2 = new TextEncoder().encode('message 2');

      const signature1 = await signMessage(message1, keypair.privateKey);
      const signature2 = await signMessage(message2, keypair.privateKey);

      expect(signature1).not.toEqual(signature2);
    });

    it('should produce same signature for same message (deterministic)', async () => {
      const keypair = await generateKeyPair();
      const message = new TextEncoder().encode('test message');

      const signature1 = await signMessage(message, keypair.privateKey);
      const signature2 = await signMessage(message, keypair.privateKey);

      expect(signature1).toEqual(signature2);
    });

    it('should produce different signatures with different private keys', async () => {
      const keypair1 = await generateKeyPair();
      const keypair2 = await generateKeyPair();
      const message = new TextEncoder().encode('test message');

      const signature1 = await signMessage(message, keypair1.privateKey);
      const signature2 = await signMessage(message, keypair2.privateKey);

      expect(signature1).not.toEqual(signature2);
    });

    it('should handle empty messages', async () => {
      const keypair = await generateKeyPair();
      const message = new Uint8Array(0);
      const signature = await signMessage(message, keypair.privateKey);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should handle large messages', async () => {
      const keypair = await generateKeyPair();
      const largeMessage = new Uint8Array(10000).fill(42);
      const signature = await signMessage(largeMessage, keypair.privateKey);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });
  });
});
