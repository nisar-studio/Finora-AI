import { NextFunction, Request, Response } from 'express';
import { rateLimit, Options } from 'express-rate-limit';
import { z } from 'zod';

function identifier(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? req.ip ?? '';
}

export function createRateLimiter(options: {
  windowMs: number;
  limit: number;
}): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: identifier,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
      });
    },
  });
}

export function validate(schema: z.ZodType<unknown>): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: result.error.flatten(),
        },
      });
      return;
    }
    // Attach the parsed (coerced + defaulted) payload so handlers can rely on
    // validated shapes instead of re-parsing raw inputs.
    (req as Request & { validated?: unknown }).validated = result.data;
    next();
  };
}

export type ValidatedRequest<T> = Request & { validated: T };