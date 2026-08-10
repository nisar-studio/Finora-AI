import { NextFunction, Request, Response } from 'express';
import { AuthedRequest } from '../../middleware/auth.js';
import { ValidatedRequest } from '../../middleware/validate.js';
import { CoachQueryInput } from './coach.schemas.js';
import { getCoachService } from './coach.service.js';

export async function coachQueryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { question } = (req as ValidatedRequest<{ body: CoachQueryInput }>).validated.body;
    const clerkId = (req as AuthedRequest).userId;
    const result = await getCoachService().answerQuestion(clerkId, question);
    res.json(result);
  } catch (error) {
    next(error);
  }
}