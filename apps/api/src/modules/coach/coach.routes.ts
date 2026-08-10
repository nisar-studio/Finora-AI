import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter, validate } from '../../middleware/validate.js';
import { coachQuerySchema } from './coach.schemas.js';
import { coachQueryHandler } from './coach.controller.js';

export const coachRouter = Router();

// The clerkId used to build the financial context always comes from the
// verified Clerk session, never from the client.
coachRouter.use(requireAuth);

coachRouter.post(
  '/query',
  createRateLimiter({ windowMs: 60_000, limit: 30 }),
  validate(coachQuerySchema),
  coachQueryHandler
);