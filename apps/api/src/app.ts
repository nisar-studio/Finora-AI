import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { healthRouter } from './modules/health/health.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { goalsRouter } from './modules/goals/goals.routes.js';
import { coachRouter } from './modules/coach/coach.routes.js';
import { intelligenceRouter } from './modules/intelligence/intelligence.routes.js';

export function createApp(): Application {
  const config = env();
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));

  // Health is intentionally public (ops/liveness probe).
  app.use('/api/v1', healthRouter);

  // Everything below the health route requires Clerk session verification.
  // If CLERK_JWT_KEY (a PEM public key) is set, Clerk verifies networklessly.
  app.use(
    clerkMiddleware({
      secretKey: config.CLERK_SECRET_KEY,
      publishableKey: config.CLERK_PUBLISHABLE_KEY,
      jwtKey: config.CLERK_JWT_KEY,
    })
  );

  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/transactions', transactionsRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/goals', goalsRouter);
  app.use('/api/v1/coach', coachRouter);
  app.use('/api/v1/intelligence', intelligenceRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}