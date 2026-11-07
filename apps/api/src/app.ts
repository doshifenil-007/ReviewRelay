import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { createRateLimiter } from './middleware/rate-limiter.middleware';
import { config } from './config/env';

export function createApp(): express.Application {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin:
        config.env === 'production'
          ? [config.corsOrigin]
          : [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256', 'X-GitHub-Delivery', 'X-GitHub-Event'],
    })
  );

  // Global rate limiter
  app.use(createRateLimiter());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'ReviewRelay API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Standard JSON parser for all routes EXCEPT webhooks
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/webhooks')) {
      next(); // Handled by webhookRawBodyParser in webhookRouter
    } else {
      express.json({ limit: '10mb' })(req, res, next);
    }
  });

  app.use(express.urlencoded({ extended: true }));

  // Main API routes
  app.use('/api', apiRouter);

  // Central error handling
  app.use(errorHandler);

  return app;
}
