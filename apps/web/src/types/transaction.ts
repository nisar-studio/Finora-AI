import type { Paise } from './money';

/** Mirrors the API transaction model. Amounts are integer paise. */
export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual';

export const TRANSACTION_CATEGORIES = [
  'salary',
  'freelance',
  'investment',
  'business',
  'food',
  'transport',
  'housing',
  'utilities',
  'entertainment',
  'healthcare',
  'shopping',
  'education',
  'travel',
  'other',
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export interface Transaction {
  id: string;
  clerkId: string;
  type: TransactionType;
  amountPaise: Paise;
  category: TransactionCategory;
  description: string;
  date: string;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amountPaise: Paise;
  category: TransactionCategory;
  description?: string;
  date: string;
}

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export interface ListTransactionsParams {
  type?: TransactionType;
  category?: TransactionCategory;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface TransactionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ListTransactionsResponse {
  transactions: Transaction[];
  pagination: TransactionPagination;
}

export function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}