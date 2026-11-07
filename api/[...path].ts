import type { Request, Response } from 'express';
import { createApp } from '../apps/api/src/app';
import { connectDatabase } from '../apps/api/src/config/db';
import { redisService } from '../apps/api/src/config/redis';

const app = createApp();
let initialization: Promise<void> | undefined;

function initializeServices(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      await redisService.connect();
      await connectDatabase();
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }

  return initialization;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    await initializeServices();
    app(req, res);
  } catch (error) {
    console.error('[ReviewRelay API] Service initialization failed', error);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  }
}
