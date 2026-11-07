import express, { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * Route-specific raw body parser for webhook endpoints.
 * Captures raw Buffer on req.rawBody without pre-parsing JSON.
 */
export const webhookRawBodyParser = express.raw({
  type: '*/*',
  limit: '5mb',
  verify: (req: Request, _res: Response, buf: Buffer) => {
    req.rawBody = buf;
  },
});
