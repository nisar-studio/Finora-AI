import { Request, Router } from 'express';
import { requireAuth, requireUser, UserRequest } from '../../middleware/auth.js';
import { serializeUser } from '../../services/user.service.js';

export const usersRouter = Router();

// Mount after clerkMiddleware + requireAuth, so everything here is protected.
usersRouter.get('/me', requireAuth, requireUser, (req: Request, res) => {
  res.json({ user: serializeUser((req as UserRequest).user) });
});