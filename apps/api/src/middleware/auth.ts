import { NextFunction, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { findOrCreateUser } from '../services/user.service.js';
import type { UserDoc } from '../models/User.model.js';

export type AuthedRequest = Request & { userId: string };

export type UserRequest = AuthedRequest & { user: UserDoc };

/**
 * Rejects requests without a verified Clerk session.
 * Runs after clerkMiddleware, so `getAuth` reflects the verified token.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);

  if (!auth.isAuthenticated || !auth.userId) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
    });
    return;
  }

  (req as AuthedRequest).userId = auth.userId;
  next();
}

/**
 * Resolves the authenticated Clerk userId to a User document, lazily creating
 * the row on the first authenticated request. Attaches the doc to `req.user`.
 *
 * Every user-owned query is scoped by `req.user.clerkId` (the Clerk userId).
 */
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authedReq = req as AuthedRequest;

  if (!authedReq.userId) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
    });
    return;
  }

  const sessionClaims = getAuth(req).sessionClaims as { email?: string } | undefined;
  const email = typeof sessionClaims?.email === 'string' ? sessionClaims.email : undefined;

  try {
    const user = await findOrCreateUser({ clerkId: authedReq.userId, email });
    (req as AuthedRequest & { user: UserDoc }).user = user;
    next();
  } catch (error) {
    next(error);
  }
}