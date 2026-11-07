import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/env';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle custom status errors
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && config.env === 'production'
    ? 'Internal server error'
    : err.message || 'An unexpected error occurred';

  console.error(`[Error] ${statusCode} - ${err.message}`, err.stack);

  res.status(statusCode).json({
    error: message,
    ...(config.env !== 'production' && { stack: err.stack }),
  });
}
