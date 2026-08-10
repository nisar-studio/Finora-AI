import { Transaction, TransactionDoc } from '../models/Transaction.model.js';
import { CreateTransactionInput, ListTransactionsQuery, UpdateTransactionInput } from '../modules/transactions/transactions.schemas.js';

/**
 * Every query is scoped by `clerkId` — the authenticated Clerk user — so a user
 * can never read, update, or delete another user's transactions. Transaction
 * ids are matched together with the owner at the DB level.
 */

export interface ListTransactionsOptions {
  type?: string;
  category?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export async function createTransaction(
  clerkId: string,
  input: CreateTransactionInput
): Promise<TransactionDoc> {
  const doc = await Transaction.create({
    clerkId,
    type: input.type,
    amountPaise: input.amountPaise,
    category: input.category,
    description: input.description,
    date: new Date(input.date),
    source: input.source,
  });
  return doc.toObject() as unknown as TransactionDoc;
}

export async function listTransactions(
  clerkId: string,
  query: ListTransactionsQuery
): Promise<{ transactions: TransactionDoc[]; total: number; page: number; limit: number; totalPages: number; hasMore: boolean }> {
  const filter: Record<string, unknown> = { clerkId };

  if (query.type) {
    filter.type = query.type;
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) {
      (filter.date as Record<string, unknown>).$gte = new Date(query.from);
    }
    if (query.to) {
      (filter.date as Record<string, unknown>).$lte = new Date(query.to);
    }
  }

  const skip = (query.page - 1) * query.limit;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / query.limit) || 1;

  return {
    transactions: transactions as unknown as TransactionDoc[],
    total,
    page: query.page,
    limit: query.limit,
    totalPages,
    hasMore: query.page < totalPages,
  };
}

export async function getTransactionById(
  clerkId: string,
  id: string
): Promise<TransactionDoc | null> {
  return (await Transaction.findOne({ _id: id, clerkId }).lean()) as TransactionDoc | null;
}

export async function updateTransaction(
  clerkId: string,
  id: string,
  patch: UpdateTransactionInput
): Promise<TransactionDoc | null> {
  const update: Record<string, unknown> = { ...patch };
  if (patch.date) {
    update.date = new Date(patch.date);
  }

  const doc = await Transaction.findOneAndUpdate(
    { _id: id, clerkId },
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  return doc as TransactionDoc | null;
}

export async function deleteTransaction(
  clerkId: string,
  id: string
): Promise<boolean> {
  const result = await Transaction.deleteOne({ _id: id, clerkId });
  return result.deletedCount > 0;
}

export function serializeTransaction(doc: TransactionDoc) {
  return {
    id: doc._id.toString(),
    clerkId: doc.clerkId,
    type: doc.type,
    amountPaise: doc.amountPaise,
    category: doc.category,
    description: doc.description,
    date: doc.date,
    source: doc.source,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}