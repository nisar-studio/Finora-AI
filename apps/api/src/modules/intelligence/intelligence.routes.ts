import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter, validate } from '../../middleware/validate.js';
import { intelligenceQuerySchema } from './intelligence.schemas.js';
import { getIntelligence } from './intelligence.controller.js';

export const intelligenceRouter = Router();

// clerkId is always derived from the verified Clerk session.
intelligenceRouter.use(requireAuth);

intelligenceRouter.get(
  '/',
  createRateLimiter({ windowMs: 60_000, limit: 20 }),
  validate(intelligenceQuerySchema),
  getIntelligence
);