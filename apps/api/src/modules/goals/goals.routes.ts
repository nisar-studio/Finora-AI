import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createGoalSchema,
  goalIdSchema,
  updateGoalSchema,
} from './goals.schemas.js';
import {
  createGoalHandler,
  deleteGoalHandler,
  getGoalHandler,
  listGoalsHandler,
  updateGoalHandler,
} from './goals.controller.js';

export const goalsRouter = Router();

// Everything below requires a verified Clerk session. The clerkId comes from
// the session, never from the client.
goalsRouter.use(requireAuth);

goalsRouter.post('/', validate(createGoalSchema), createGoalHandler);
goalsRouter.get('/', listGoalsHandler);
goalsRouter.get('/:id', validate(goalIdSchema), getGoalHandler);
goalsRouter.patch('/:id', validate(updateGoalSchema), updateGoalHandler);
goalsRouter.delete('/:id', validate(goalIdSchema), deleteGoalHandler);