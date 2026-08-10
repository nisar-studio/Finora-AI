import { Router } from 'express';
import { mongoReady } from '../../config/mongo.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'finora-api',
    mongo: mongoReady() ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});