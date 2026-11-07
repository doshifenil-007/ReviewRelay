import { redisService } from '../config/redis';

export class IdempotencyService {
  private static readonly TTL_SECONDS = 86400; // 24 hours

  /**
   * Attempts to lock a delivery ID in Redis with NX and 24h expiration.
   * Returns true if this is the first time the delivery ID is seen (unique).
   * Returns false if the delivery ID was already registered (duplicate).
   */
  public static async registerDelivery(deliveryId: string): Promise<boolean> {
    if (!deliveryId) {
      return false;
    }
    const key = `delivery:${deliveryId}`;
    return await redisService.setNxEx(key, '1', this.TTL_SECONDS);
  }
}
