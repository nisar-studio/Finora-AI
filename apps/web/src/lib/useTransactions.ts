import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from './transactionsApi';
import {
  CreateTransactionInput,
  ListTransactionsParams,
  UpdateTransactionInput,
} from '../types/transaction';

function transactionsKey(params: ListTransactionsParams): unknown[] {
  return [
    'transactions',
    params.type ?? null,
    params.category ?? null,
    params.from ?? null,
    params.to ?? null,
    params.page ?? 1,
    params.limit ?? 20,
  ];
}

export function useTransactions(params: ListTransactionsParams) {
  return useQuery({
    queryKey: transactionsKey(params),
    queryFn: () => transactionsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id?: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactionsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) =>
      transactionsApi.update(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transaction', id] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}