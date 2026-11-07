import { Request, Response, NextFunction } from 'express';
import { redisService } from '../config/redis';
import { config } from '../config/env';

export function createRateLimiter(
  maxRequests: number = config.rateLimit.maxRequests,
  windowSeconds: number = config.rateLimit.windowSeconds
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Determine client identifier (IP or X-Forwarded-For)
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const key = `ratelimit:${clientIp}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

    try {
      const currentCount = await redisService.incrWithExpiry(key, windowSeconds);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));

      if (currentCount > maxRequests) {
        res.setHeader('Retry-After', windowSeconds);
        res.status(429).json({
          error: 'Too many requests. Please slow down.',
          retryAfterSeconds: windowSeconds,
        });
        return;
      }

      next();
    } catch (err) {
      // In case of rate limiter errors, fail open in development or pass through
      next();
    }
  };
}
