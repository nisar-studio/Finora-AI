import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { analyticsSummaryQuerySchema } from './analytics.schemas.js';
import { getSummary } from './analytics.controller.js';

export const analyticsRouter = Router();

// Everything below requires a verified Clerk session. The clerkId comes from
// the session, never from the client.
analyticsRouter.use(requireAuth);

analyticsRouter.get('/summary', validate(analyticsSummaryQuerySchema), getSummary);