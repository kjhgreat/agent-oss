/**
 * Tests for signature verification
 */

import { describe, expect, it } from 'vitest';
import { generateKeyPair } from '../keys.js';
import { signMessage } from '../sign.js';
import { verifySignature } from '../verify.js';

describe('verify', () => {
  describe('verifySignature', () => {
    it('should return true for valid signature', async () => {
      const keypair = await generateKeyPair();
      const message = new TextEncoder().encode('test message');
      const signature = await signMessage(message, keypair.privateKey);

      const isValid = await verifySignature(message, signature, keypair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should return false for wrong message', async () => {
      const keypair = await generateKeyPair();
      const message1 = new TextEncoder().encode('message 1');
      const message2 = new TextEncoder().encode('message 2');
      const signature = await signMessage(message1, keypair.privateKey);

      const isValid = await verifySignature(message2, signature, keypair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should return false for wrong public key', async () => {
      const keypair1 = await generateKeyPair();
      const keypair2 = await generateKeyPair();
      const message = new TextEncoder().encode('test message');
      const signature = await signMessage(message, keypair1.privateKey);

      const isValid = await verifySignature(message, signature, keypair2.publicKey);

      expect(isValid).toBe(false);
    });

    it('should return false for tampered signature', async () => {
      const keypair = await generateKeyPair();
      const message = new TextEncoder().encode('test message');
      const signature = await signMessage(message, keypair.privateKey);

      // Tamper with the signature
      const tamperedSignature = new Uint8Array(signature);
      tamperedSignature[0] ^= 0x01; // Flip one bit

      const isValid = await verifySignature(message, tamperedSignature, keypair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid signature length', async () => {
      const keypair = await generateKeyPair();
      const message = new TextEncoder().encode('test message');
      const invalidSignature = new Uint8Array(32); // Should be 64 bytes

      const isValid = await verifySignature(message, invalidSignature, keypair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid public key length', async () => {
      const keypair = await generateKeyPair();
      const message = new TextEncoder().encode('test message');
      const signature = await signMessage(message, keypair.privateKey);
      const invalidPublicKey = new Uint8Array(16); // Should be 32 bytes

      const isValid = await verifySignature(message, signature, invalidPublicKey);

      expect(isValid).toBe(false);
    });

    it('should handle empty messages', async () => {
      const keypair = await generateKeyPair();
      const message = new Uint8Array(0);
      const signature = await signMessage(message, keypair.privateKey);

      const isValid = await verifySignature(message, signature, keypair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should handle large messages', async () => {
      const keypair = await generateKeyPair();
      const largeMessage = new Uint8Array(10000).fill(42);
      const signature = await signMessage(largeMessage, keypair.privateKey);

      const isValid = await verifySignature(largeMessage, signature, keypair.publicKey);

      expect(isValid).toBe(true);
    });
  });
});
