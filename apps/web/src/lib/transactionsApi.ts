import { api } from './api';
import {
  CreateTransactionInput,
  ListTransactionsParams,
  ListTransactionsResponse,
  Transaction,
  UpdateTransactionInput,
} from '../types/transaction';

export function transactionQueryString(params: ListTransactionsParams): string {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.category) search.set('category', params.category);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const transactionsApi = {
  async list(params: ListTransactionsParams): Promise<ListTransactionsResponse> {
    return api.get<ListTransactionsResponse>(`/v1/transactions${transactionQueryString(params)}`);
  },

  async get(id: string): Promise<Transaction> {
    const res = await api.get<{ transaction: Transaction }>(`/v1/transactions/${id}`);
    return res.transaction;
  },

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const res = await api.post<{ transaction: Transaction }>('/v1/transactions', input);
    return res.transaction;
  },

  async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const res = await api.patch<{ transaction: Transaction }>(`/v1/transactions/${id}`, input);
    return res.transaction;
  },

  async remove(id: string): Promise<void> {
    await api.delete<void>(`/v1/transactions/${id}`);
  },
};