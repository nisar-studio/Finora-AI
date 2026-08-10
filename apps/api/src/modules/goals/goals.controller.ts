import { NextFunction, Request, Response } from 'express';
import { AuthedRequest } from '../../middleware/auth.js';
import { ValidatedRequest } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import { CreateGoalInput, UpdateGoalInput } from './goals.schemas.js';
import {
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  serializeGoal,
  updateGoal,
} from './goals.service.js';

const toClerkId = (req: Request): string => (req as AuthedRequest).userId;
const notFound = (): AppError => new AppError(404, 'NOT_FOUND', 'Goal not found.');

export async function createGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = (req as ValidatedRequest<{ body: CreateGoalInput }>).validated;
    const goal = await createGoal(toClerkId(req), body);
    res.status(201).json({ goal: serializeGoal(goal) });
  } catch (error) {
    next(error);
  }
}

export async function listGoalsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goals = await listGoals(toClerkId(req));
    res.json({ goals: goals.map((goal) => serializeGoal(goal)) });
  } catch (error) {
    next(error);
  }
}

export async function getGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = (req as ValidatedRequest<{ params: { id: string } }>).validated.params;
    const goal = await getGoal(toClerkId(req), id);
    if (!goal) {
      throw notFound();
    }
    res.json({ goal: serializeGoal(goal) });
  } catch (error) {
    next(error);
  }
}

export async function updateGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { params, body } = (
      req as ValidatedRequest<{ params: { id: string }; body: UpdateGoalInput }>
    ).validated;
    const goal = await updateGoal(toClerkId(req), params.id, body);
    if (!goal) {
      throw notFound();
    }
    res.json({ goal: serializeGoal(goal) });
  } catch (error) {
    next(error);
  }
}

export async function deleteGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = (req as ValidatedRequest<{ params: { id: string } }>).validated.params;
    const deleted = await deleteGoal(toClerkId(req), id);
    if (!deleted) {
      throw notFound();
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}