import crypto from 'crypto';

export class SignatureService {
  /**
   * Verifies the GitHub HMAC SHA-256 webhook signature.
   * Uses crypto.timingSafeEqual to prevent timing attacks.
   *
   * @param rawBody - Raw Buffer or string of the incoming request body
   * @param signatureHeader - The X-Hub-Signature-256 header (e.g. 'sha256=abcdef...')
   * @param secret - The configured webhook secret for the repository or platform
   */
  public static verifySignature(
    rawBody: Buffer | string,
    signatureHeader: string | undefined,
    secret: string
  ): boolean {
    if (!signatureHeader || !secret) {
      return false;
    }

    if (!signatureHeader.startsWith('sha256=')) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
      hmac.update(bodyBuffer);
      const computedHex = 'sha256=' + hmac.digest('hex');

      const expectedBuffer = Buffer.from(computedHex, 'utf8');
      const providedBuffer = Buffer.from(signatureHeader, 'utf8');

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (err) {
      return false;
    }
  }

  /**
   * Helper utility for testing: signs a payload using the secret.
   */
  public static signPayload(payload: string | Buffer, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    const bodyBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
    hmac.update(bodyBuffer);
    return 'sha256=' + hmac.digest('hex');
  }
}
