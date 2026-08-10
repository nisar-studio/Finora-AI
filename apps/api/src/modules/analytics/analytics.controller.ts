import { NextFunction, Request, Response } from 'express';
import { AuthedRequest } from '../../middleware/auth.js';
import { ValidatedRequest } from '../../middleware/validate.js';
import { AnalyticsSummaryQuery } from './analytics.schemas.js';
import { getAnalyticsSummary } from './analytics.service.js';

export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clerkId = (req as AuthedRequest).userId;
    const { query } = (req as ValidatedRequest<{ query: AnalyticsSummaryQuery }>).validated;
    const summary = await getAnalyticsSummary(clerkId, query);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}