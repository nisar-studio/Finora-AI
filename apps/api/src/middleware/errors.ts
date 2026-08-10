import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid JSON body.' } });
    return;
  }

  console.error('[error]', err instanceof Error ? err.stack ?? err.message : err);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err instanceof Error
        ? err.message
        : 'Unknown error.';
  res.status(500).json({ error: { code: 'INTERNAL', message } });
}