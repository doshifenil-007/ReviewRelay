import { describe, it, expect } from 'vitest';
import { SignatureService } from '../src/services/signature.service';
import crypto from 'crypto';

describe('SignatureService (HMAC SHA-256 Webhook Verification)', () => {
  const secret = 'super-secret-test-webhook-key';
  const payload = JSON.stringify({ action: 'opened', repository: { id: 12345 } });

  it('validates a correctly signed payload', () => {
    const signature = SignatureService.signPayload(payload, secret);
    const isValid = SignatureService.verifySignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('rejects an invalid signature with different hash', () => {
    const invalidSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';
    const isValid = SignatureService.verifySignature(payload, invalidSignature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects a signature created with a different secret', () => {
    const wrongSignature = SignatureService.signPayload(payload, 'wrong-secret');
    const isValid = SignatureService.verifySignature(payload, wrongSignature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects when payload is tampered after signing', () => {
    const signature = SignatureService.signPayload(payload, secret);
    const tamperedPayload = JSON.stringify({ action: 'opened', repository: { id: 99999 } });
    const isValid = SignatureService.verifySignature(tamperedPayload, signature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects missing or malformed signature header', () => {
    expect(SignatureService.verifySignature(payload, undefined, secret)).toBe(false);
    expect(SignatureService.verifySignature(payload, '', secret)).toBe(false);
    expect(SignatureService.verifySignature(payload, 'notsha256=123', secret)).toBe(false);
  });
});
