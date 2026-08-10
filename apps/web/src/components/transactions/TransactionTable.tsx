import { Trash2 } from 'lucide-react';
import { useDeleteTransaction } from '../../lib/useTransactions';
import { formatINR } from '../../types/money';
import { categoryLabel, Transaction } from '../../types/transaction';

interface TransactionTableProps {
  transactions: Transaction[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso)
  );
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const remove = useDeleteTransaction();

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-ink/10 bg-surface p-8 text-center">
        <p className="text-sm font-medium">No transactions yet</p>
        <p className="mt-1 text-sm text-ink-muted">
          Add your first income or expense above to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink/10 bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-muted">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-3 text-ink-muted">{formatDate(transaction.date)}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    transaction.type === 'income'
                      ? 'text-emerald-400'
                      : 'text-ink-muted'
                  }
                >
                  {transaction.type === 'income' ? 'Income' : 'Expense'}
                </span>
              </td>
              <td className="px-4 py-3">{categoryLabel(transaction.category)}</td>
              <td className="px-4 py-3 text-ink-muted">{transaction.description || '—'}</td>
              <td
                className={
                  transaction.type === 'income'
                    ? 'px-4 py-3 text-right font-medium text-emerald-400'
                    : 'px-4 py-3 text-right font-medium text-ink'
                }
              >
                {transaction.type === 'income' ? '+ ' : '− '}
                {formatINR(transaction.amountPaise)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  aria-label={`Delete ${formatINR(transaction.amountPaise)} transaction`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(transaction.id)}
                  className="rounded p-1 text-ink-muted transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}