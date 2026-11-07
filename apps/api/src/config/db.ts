import mongoose from 'mongoose';
import { config } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[MongoDB] Connected successfully.');
  } catch {
    console.error('[MongoDB] Connection failed. Check the configured database endpoint and credentials.');
    if (config.env === 'production') {
      throw new Error('MongoDB connection failed');
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
