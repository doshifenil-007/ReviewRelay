import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { redisService } from './config/redis';
import { config } from './config/env';

async function bootstrap() {
  console.log('--- ReviewRelay Backend Starting ---');

  // Connect to Redis (with automatic in-memory fallback if standalone)
  await redisService.connect();

  // Connect to MongoDB
  await connectDatabase();

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`[ReviewRelay API] Server listening on port ${config.port}`);
    console.log(`[ReviewRelay API] Environment: ${config.env}`);
    console.log(`[ReviewRelay API] Webhook endpoint: http://localhost:${config.port}/api/webhooks/github`);
  });

  const shutdown = async () => {
    console.log('\n[ReviewRelay API] Shutting down gracefully...');
    server.close(async () => {
      await redisService.disconnect();
      await disconnectDatabase();
      console.log('[ReviewRelay API] Resources released. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[ReviewRelay API] Fatal startup error:', err);
  process.exit(1);
});
