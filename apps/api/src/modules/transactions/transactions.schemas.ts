import { z } from 'zod';
import { TRANSACTION_CATEGORIES, TRANSACTION_TYPES } from '../../models/Transaction.model.js';

const MONGO_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid transaction id');

// RFC 3339 date-time (ISO 8601), e.g. 2026-07-30T10:30:00.000Z.
const dateTime = (label: string) =>
  z.string({ required_error: `${label} is required` }).datetime({ offset: true });

const category = z.enum(TRANSACTION_CATEGORIES);
const transactionType = z.enum(TRANSACTION_TYPES);

export const createTransactionSchema = z.object({
  body: z.object({
    type: transactionType,
    amountPaise: z.number().int().positive('Amount must be a positive integer of paise'),
    category,
    description: z.string().trim().max(500).optional().default(''),
    date: dateTime('date'),
    source: z.literal('manual').optional().default('manual'),
  }),
});

const updateBody = z
  .object({
    type: transactionType.optional(),
    amountPaise: z.number().int().positive('Amount must be a positive integer of paise').optional(),
    category: category.optional(),
    description: z.string().trim().max(500).optional(),
    date: dateTime('date').optional(),
    source: z.literal('manual').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const updateTransactionSchema = z.object({
  params: z.object({ id: MONGO_ID }),
  body: updateBody,
});

export const transactionIdSchema = z.object({
  params: z.object({ id: MONGO_ID }),
});

const DATE_QUERY_ERROR =
  'Must be an ISO 8601 date-time string, e.g. 2026-07-30T00:00:00.000Z';

export const listTransactionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: transactionType.optional(),
    category: category.optional(),
    from: z.string({ invalid_type_error: DATE_QUERY_ERROR }).datetime({ offset: true }).optional(),
    to: z.string({ invalid_type_error: DATE_QUERY_ERROR }).datetime({ offset: true }).optional(),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateBody>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>['query'];