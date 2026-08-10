import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth, AuthedRequest } from '../../middleware/auth.js';
import { validate, ValidatedRequest } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errors.js';
import {
  createTransactionSchema,
  transactionIdSchema,
  updateTransactionSchema,
  listTransactionsSchema,
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from './transactions.schemas.js';
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  serializeTransaction,
  updateTransaction,
} from '../../services/transaction.service.js';

export const transactionsRouter = Router();

// Everything below requires a verified Clerk session.
transactionsRouter.use(requireAuth);

const toClerkId = (req: Request): string => (req as AuthedRequest).userId;

const notFound = (): AppError => new AppError(404, 'NOT_FOUND', 'Transaction not found.');

transactionsRouter.post(
  '/',
  validate(createTransactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body } = (req as ValidatedRequest<{ body: CreateTransactionInput }>).validated;
      const transaction = await createTransaction(toClerkId(req), body);
      res.status(201).json({ transaction: serializeTransaction(transaction) });
    } catch (error) {
      next(error);
    }
  }
);

transactionsRouter.get(
  '/',
  validate(listTransactionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = (req as ValidatedRequest<{ query: ListTransactionsQuery }>).validated;
      const result = await listTransactions(toClerkId(req), query);
      res.json({
        transactions: result.transactions.map(serializeTransaction),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

transactionsRouter.get(
  '/:id',
  validate(transactionIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req as ValidatedRequest<{ params: { id: string } }>).validated.params;
      const transaction = await getTransactionById(toClerkId(req), id);
      if (!transaction) {
        throw notFound();
      }
      res.json({ transaction: serializeTransaction(transaction) });
    } catch (error) {
      next(error);
    }
  }
);

transactionsRouter.patch(
  '/:id',
  validate(updateTransactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = (req as ValidatedRequest<{ params: { id: string }; body: UpdateTransactionInput }>)
        .validated;
      const transaction = await updateTransaction(toClerkId(req), validated.params.id, validated.body);
      if (!transaction) {
        throw notFound();
      }
      res.json({ transaction: serializeTransaction(transaction) });
    } catch (error) {
      next(error);
    }
  }
);

transactionsRouter.delete(
  '/:id',
  validate(transactionIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = (req as ValidatedRequest<{ params: { id: string } }>).validated.params;
      const deleted = await deleteTransaction(toClerkId(req), id);
      if (!deleted) {
        throw notFound();
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);