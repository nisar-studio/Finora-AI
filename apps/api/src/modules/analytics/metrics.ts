import { TransactionCategory, TransactionType } from '../../models/Transaction.model.js';

/**
 * Pure, deterministic analytics over a set of the user's own transactions.
 * No DB access, no I/O, no randomness. All monetary intermediates are integer
 * paise; only display percentages are rounded (2 d.p.).
 */

export interface AnalyticsTx {
  id?: string;
  type: TransactionType;
  amountPaise: number;
  category: TransactionCategory;
  date: Date;
  description?: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface SummaryMetrics {
  /** Total income − total expense for the period (paise). */
  balancePaise: number;
  incomePaise: number;
  expensePaise: number;
  /** income − expense (identical to balance for a period). */
  savingsPaise: number;
  /** savings / income × 100. 0 when income is zero. */
  savingsRate: number;
  transactionCount: number;
}

export function computeMetrics(transactions: AnalyticsTx[]): SummaryMetrics {
  let incomePaise = 0;
  let expensePaise = 0;

  for (const txn of transactions) {
    if (txn.type === 'income') {
      incomePaise += txn.amountPaise;
    } else {
      expensePaise += txn.amountPaise;
    }
  }

  const savingsPaise = incomePaise - expensePaise;
  const savingsRate = incomePaise === 0 ? 0 : round2((savingsPaise / incomePaise) * 100);

  return {
    balancePaise: incomePaise - expensePaise,
    incomePaise,
    expensePaise,
    savingsPaise,
    savingsRate,
    transactionCount: transactions.length,
  };
}

export interface CategoryBreakdown {
  category: string;
  amountPaise: number;
  /** share of total for the matching type; 0 when there is none. */
  percentage: number;
}

function aggregateByCategory(
  transactions: AnalyticsTx[],
  type: TransactionType
): CategoryBreakdown[] {
  const totals = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.type !== type) {
      continue;
    }
    totals.set(txn.category, (totals.get(txn.category) ?? 0) + txn.amountPaise);
  }

  const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return [...totals.entries()]
    .map(([category, amountPaise]) => ({
      category,
      amountPaise,
      percentage: grandTotal === 0 ? 0 : round2((amountPaise / grandTotal) * 100),
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);
}

export function expenseCategoryTotals(transactions: AnalyticsTx[]): CategoryBreakdown[] {
  return aggregateByCategory(transactions, 'expense');
}

export function incomeCategoryTotals(transactions: AnalyticsTx[]): CategoryBreakdown[] {
  return aggregateByCategory(transactions, 'income');
}

export interface LargestExpense {
  id: string;
  amountPaise: number;
  category: TransactionCategory;
  description: string;
  date: Date;
}

export function largestExpense(transactions: AnalyticsTx[]): LargestExpense | null {
  let best: AnalyticsTx | null = null;
  for (const txn of transactions) {
    if (txn.type !== 'expense') {
      continue;
    }
    if (!best || txn.amountPaise > best.amountPaise) {
      best = txn;
    }
  }
  if (!best?.id) {
    return null;
  }
  return {
    id: best.id,
    amountPaise: best.amountPaise,
    category: best.category,
    description: best.description ?? '',
    date: best.date,
  };
}

export interface TrendEntry {
  /** UTC month key, e.g. "2026-07". */
  month: string;
  incomePaise: number;
  expensePaise: number;
  savingsPaise: number;
}

export function toUtcMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Zero-fills every calendar month between `start` and `end` (inclusive, in
 * UTC months) and buckets the given transactions into them, ascending.
 */
export function buildMonthlyTrend(
  transactions: AnalyticsTx[],
  start: Date,
  end: Date
): TrendEntry[] {
  const buckets = new Map<string, TrendEntry>();
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor <= last) {
    const month = toUtcMonthKey(cursor);
    buckets.set(month, { month, incomePaise: 0, expensePaise: 0, savingsPaise: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  for (const txn of transactions) {
    const bucket = buckets.get(toUtcMonthKey(txn.date));
    if (!bucket) {
      continue;
    }
    if (txn.type === 'income') {
      bucket.incomePaise += txn.amountPaise;
    } else {
      bucket.expensePaise += txn.amountPaise;
    }
    bucket.savingsPaise = bucket.incomePaise - bucket.expensePaise;
  }

  return [...buckets.values()];
}

/**
 * Percent change from `previous` to `current`.
 * Returns null when the previous value is zero (undefined denominator).
 * Uses the absolute previous value so the sign is well-defined.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

export interface PeriodComparison {
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
  savingsChangePercent: number | null;
}

export function comparePeriods(current: SummaryMetrics, previous: SummaryMetrics): PeriodComparison {
  return {
    incomeChangePercent: percentChange(current.incomePaise, previous.incomePaise),
    expenseChangePercent: percentChange(current.expensePaise, previous.expensePaise),
    savingsChangePercent: percentChange(current.savingsPaise, previous.savingsPaise),
  };
}