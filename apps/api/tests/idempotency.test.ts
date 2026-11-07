import { describe, it, expect } from 'vitest';
import { IdempotencyService } from '../src/services/idempotency.service';
import crypto from 'crypto';

describe('IdempotencyService (Redis Deduplication)', () => {
  it('registers a new unique delivery ID successfully', async () => {
    const deliveryId = crypto.randomUUID();
    const isNew = await IdempotencyService.registerDelivery(deliveryId);
    expect(isNew).toBe(true);
  });

  it('rejects a duplicate delivery ID seen a second time', async () => {
    const deliveryId = crypto.randomUUID();
    const firstAttempt = await IdempotencyService.registerDelivery(deliveryId);
    expect(firstAttempt).toBe(true);

    const secondAttempt = await IdempotencyService.registerDelivery(deliveryId);
    expect(secondAttempt).toBe(false);
  });
});
