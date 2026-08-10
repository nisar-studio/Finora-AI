import { useEffect, useState } from 'react';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { useTransactions } from '../lib/useTransactions';
import {
  ListTransactionsParams,
  TransactionCategory,
  TransactionType,
  TRANSACTION_CATEGORIES,
} from '../types/transaction';

const PAGE_SIZE = 20;

export function TransactionsPage() {
  const [type, setType] = useState<TransactionType | ''>('');
  const [category, setCategory] = useState<TransactionCategory | ''>('');
  const [page, setPage] = useState(1);

  const params: ListTransactionsParams = {
    type: type || undefined,
    category: category || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const query = useTransactions(params);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [type, category]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your income and expense ledger. Monetary amounts are stored and calculated as integer paise.
        </p>
      </header>

      <TransactionForm />

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType | '')}
          className="rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TransactionCategory | '')}
          className="rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">All categories</option>
          {TRANSACTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      ) : query.data ? (
        <>
          <TransactionTable transactions={query.data.transactions} />
          <Pagination
            page={query.data.pagination.page}
            totalPages={query.data.pagination.totalPages}
            total={query.data.pagination.total}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(query.data.pagination.totalPages, p + 1))}
          />
        </>
      ) : null}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-8 text-center text-sm text-ink-muted">
      Loading transactions…
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-8 text-center">
      <p className="text-sm font-medium text-red-400">Couldn’t load transactions</p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const buttonClass =
    'rounded-md border border-ink/10 bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand disabled:opacity-40 disabled:hover:border-ink/10';

  return (
    <div className="flex items-center justify-between text-sm text-ink-muted">
      <span>
        {total} transaction{total === 1 ? '' : 's'} · page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={onPrev}>
          Previous
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}