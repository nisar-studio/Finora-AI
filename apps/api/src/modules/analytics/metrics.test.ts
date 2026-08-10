import { describe, expect, it } from 'vitest';
import {
  AnalyticsTx,
  buildMonthlyTrend,
  computeMetrics,
  comparePeriods,
  expenseCategoryTotals,
  incomeCategoryTotals,
  largestExpense,
  percentChange,
} from './metrics.js';

const txn = (partial: Partial<AnalyticsTx> & Pick<AnalyticsTx, 'type' | 'amountPaise'>): AnalyticsTx => ({
  id: partial.id ?? 'tx_1',
  type: partial.type,
  amountPaise: partial.amountPaise,
  category: partial.category ?? 'other',
  date: partial.date ?? new Date('2026-07-15T00:00:00.000Z'),
  description: partial.description ?? '',
});

const FACTORY = { txn };

describe('metrics — summary metrics', () => {
  it('returns zeros for an empty set', () => {
    const m = computeMetrics([]);
    expect(m).toEqual({
      balancePaise: 0,
      incomePaise: 0,
      expensePaise: 0,
      savingsPaise: 0,
      savingsRate: 0,
      transactionCount: 0,
    });
  });

  it('computes balance, savings and savings rate from income + expenses', () => {
    const m = computeMetrics([
      FACTORY.txn({ id: 'a', type: 'income', amountPaise: 200000 }),
      FACTORY.txn({ id: 'b', type: 'expense', amountPaise: 80000 }),
    ]);

    expect(m.incomePaise).toBe(200000);
    expect(m.expensePaise).toBe(80000);
    expect(m.balancePaise).toBe(120000);
    expect(m.savingsPaise).toBe(120000);
    expect(m.savingsRate).toBe(60);
    expect(m.transactionCount).toBe(2);
  });

  it('returns 0 savings rate when income is zero', () => {
    const m = computeMetrics([FACTORY.txn({ id: 'a', type: 'expense', amountPaise: 50000 })]);
    expect(m.savingsRate).toBe(0);
    expect(m.balancePaise).toBe(-50000);
  });

  it('does not lose paise precision', () => {
    const m = computeMetrics([
      FACTORY.txn({ id: 'a', type: 'income', amountPaise: 300001 }),
      FACTORY.txn({ id: 'b', type: 'expense', amountPaise: 100099 }),
    ]);
    expect(m.balancePaise).toBe(199902);
  });
});

describe('metrics — category totals', () => {
  const transactions = [
    FACTORY.txn({ id: 'a', type: 'expense', amountPaise: 20000, category: 'food' }),
    FACTORY.txn({ id: 'b', type: 'expense', amountPaise: 10000, category: 'transport' }),
    FACTORY.txn({ id: 'c', type: 'expense', amountPaise: 20000, category: 'food' }),
    FACTORY.txn({ id: 'd', type: 'income', amountPaise: 50000, category: 'salary' }),
    FACTORY.txn({ id: 'e', type: 'income', amountPaise: 10000, category: 'freelance' }),
  ];

  it('aggregates expense categories with percentages and sorts desc', () => {
    expect(expenseCategoryTotals(transactions)).toEqual([
      { category: 'food', amountPaise: 40000, percentage: 80 },
      { category: 'transport', amountPaise: 10000, percentage: 20 },
    ]);
  });

  it('aggregates income categories', () => {
    expect(incomeCategoryTotals(transactions)).toEqual([
      { category: 'salary', amountPaise: 50000, percentage: 83.33 },
      { category: 'freelance', amountPaise: 10000, percentage: 16.67 },
    ]);
  });
});

describe('metrics — monthly trend', () => {
  it('zero-fills every month in the window and buckets transactions', () => {
    const trend = buildMonthlyTrend(
      [
        FACTORY.txn({
          id: 'a',
          type: 'income',
          amountPaise: 100000,
          date: new Date('2026-06-05T00:00:00.000Z'),
        }),
        FACTORY.txn({
          id: 'b',
          type: 'expense',
          amountPaise: 40000,
          date: new Date('2026-07-20T00:00:00.000Z'),
        }),
      ],
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-07-31T00:00:00.000Z')
    );

    expect(trend).toHaveLength(2);
    expect(trend[0]).toEqual({ month: '2026-06', incomePaise: 100000, expensePaise: 0, savingsPaise: 100000 });
    expect(trend[1]).toEqual({ month: '2026-07', incomePaise: 0, expensePaise: 40000, savingsPaise: -40000 });
  });

  it('handles an empty window by returning zero months', () => {
    const trend = buildMonthlyTrend(
      [],
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-03-31T00:00:00.000Z')
    );
    expect(trend).toHaveLength(3);
    expect(trend.map((t) => t.month)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});

describe('metrics — comparison', () => {
  it('computes percent change with a positive denominator', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(50, 100)).toBe(-50);
  });

  it('returns null when the previous value is zero', () => {
    expect(percentChange(0, 0)).toBeNull();
    expect(percentChange(50, 0)).toBeNull();
  });

  it('compares periods', () => {
    const result = comparePeriods(
      computeMetrics([FACTORY.txn({ id: 'a', type: 'income', amountPaise: 150000 })]),
      computeMetrics([FACTORY.txn({ id: 'b', type: 'income', amountPaise: 100000 })])
    );
    expect(result.incomeChangePercent).toBe(50);
    expect(result.expenseChangePercent).toBeNull(); // previous expense 0
    expect(result.savingsChangePercent).toBe(50);
  });
});

describe('metrics — largest expense', () => {
  it('returns the largest expense with details', () => {
    const result = largestExpense([
      FACTORY.txn({ id: 'a', type: 'expense', amountPaise: 2000, category: 'food', description: 'Lunch' }),
      FACTORY.txn({ id: 'b', type: 'expense', amountPaise: 99000, category: 'housing', description: 'Rent' }),
      FACTORY.txn({ id: 'c', type: 'income', amountPaise: 999999 }),
    ]);
    expect(result).toEqual({
      id: 'b',
      amountPaise: 99000,
      category: 'housing',
      description: 'Rent',
      date: new Date('2026-07-15T00:00:00.000Z'),
    });
  });

  it('returns null when there are no expenses', () => {
    expect(largestExpense([])).toBeNull();
    expect(largestExpense([FACTORY.txn({ id: 'a', type: 'income', amountPaise: 100 })])).toBeNull();
  });
});