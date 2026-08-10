import { NextFunction, Request, Response } from 'express';
import { AuthedRequest } from '../../middleware/auth.js';
import { ValidatedRequest } from '../../middleware/validate.js';
import { IntelligenceQuery } from './intelligence.schemas.js';
import { IntelligenceServiceError, getIntelligenceService } from './intelligence.service.js';

/**
 * GET /api/v1/intelligence
 * clerkId comes from the verified Clerk session - the client can never select
 * whose data is analyzed. Only the trailing-history window is client-influenced.
 */
export async function getIntelligence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clerkId = (req as AuthedRequest).userId;
    const { months } = (req as ValidatedRequest<{ query: IntelligenceQuery }>).validated.query;
    const result = await getIntelligenceService().getIntelligence(clerkId, months);
    res.json(result);
  } catch (error) {
    if (error instanceof IntelligenceServiceError) {
      res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
      return;
    }
    next(error);
  }
}