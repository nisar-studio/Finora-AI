import { FormEvent, useState } from 'react';
import { useCreateTransaction } from '../../lib/useTransactions';
import { rupeesToPaise } from '../../types/money';
import {
  CreateTransactionInput,
  TransactionCategory,
  TransactionType,
  TRANSACTION_CATEGORIES,
  categoryLabel,
} from '../../types/transaction';

/** Converts a <input type="date"> value (YYYY-MM-DD) to an ISO date-time. */
function dateToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

const inputClass =
  'w-full rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none';

export function TransactionForm() {
  const create = useCreateTransaction();

  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategory>('food');
  const [amountRupees, setAmountRupees] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountPaise = rupeesToPaise(Number(amountRupees));
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return;
    }

    const input: CreateTransactionInput = {
      type,
      category,
      amountPaise,
      date: dateToIso(date),
      description: description.trim() || undefined,
    };

    create.mutate(input, {
      onSuccess: () => {
        setType('expense');
        setCategory('food');
        setAmountRupees('');
        setDescription('');
      },
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-lg border border-ink/10 bg-surface p-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="tx-type" className="mb-1 block text-xs font-medium text-ink-muted">
          Type
        </label>
        <select
          id="tx-type"
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <div>
        <label htmlFor="tx-category" className="mb-1 block text-xs font-medium text-ink-muted">
          Category
        </label>
        <select
          id="tx-category"
          className={inputClass}
          value={category}
          onChange={(e) => setCategory(e.target.value as TransactionCategory)}
        >
          {TRANSACTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tx-amount" className="mb-1 block text-xs font-medium text-ink-muted">
          Amount (₹)
        </label>
        <input
          id="tx-amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="0.00"
          className={inputClass}
          value={amountRupees}
          onChange={(e) => setAmountRupees(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="tx-date" className="mb-1 block text-xs font-medium text-ink-muted">
          Date
        </label>
        <input
          id="tx-date"
          type="date"
          required
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="tx-description" className="mb-1 block text-xs font-medium text-ink-muted">
          Description (optional)
        </label>
        <input
          id="tx-description"
          type="text"
          maxLength={500}
          placeholder="e.g. Groceries at BigBasket"
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {create.isPending ? 'Adding…' : 'Add transaction'}
        </button>
        {create.isError && (
          <p className="text-sm text-red-400">{create.error.message}</p>
        )}
      </div>
    </form>
  );
}