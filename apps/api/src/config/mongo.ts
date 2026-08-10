import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectMongo(): Promise<boolean> {
  try {
    await mongoose.connect(env().MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('[mongo] connected');
    return true;
  } catch (error) {
    console.error(
      '[mongo] connection failed; server continues in degraded mode:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

export function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}