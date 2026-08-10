import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectMongo, disconnectMongo } from '../../config/mongo.js';
import { User } from '../../models/User.model.js';
import { Transaction } from '../../models/Transaction.model.js';
import { Goal } from '../goals/goals.model.js';
import { buildFinancialContext } from './context-builder.js';

const CLERK = 'user_2ctx';
const NOW = new Date('2026-08-10T00:00:00.000Z');

beforeAll(async () => {
  await connectMongo();
});

afterAll(async () => {
  await Goal.deleteMany({});
  await Transaction.deleteMany({});
  await User.deleteMany({});
  await disconnectMongo();
});

beforeEach(async () => {
  await Goal.deleteMany({});
  await Transaction.deleteMany({});
  await User.deleteMany({});
});

describe('context-builder — fields', () => {
  it('builds a zero context for an empty user', async () => {
    const ctx = await buildFinancialContext(CLERK, NOW);

    expect(ctx.period).toEqual({
      fromIso: '2026-08-01T00:00:00.000Z',
      toIso: '2026-08-31T23:59:59.999Z',
      label: '2026-08',
    });
    expect(ctx.summary).toEqual({
      incomePaise: 0,
      expensePaise: 0,
      savingsPaise: 0,
      savingsRate: 0,
      balancePaise: 0,
      transactionCount: 0,
    });
    expect(ctx.comparison).toEqual({
      incomeChangePercent: null,
      expenseChangePercent: null,
      savingsChangePercent: null,
    });
    expect(ctx.topSpendingCategories).toEqual([]);
    expect(ctx.incomeCategories).toEqual([]);
    expect(ctx.largestExpense).toBeNull();
    expect(ctx.categoryTrends).toEqual([]);
    expect(ctx.monthlyTrend).toHaveLength(6);
    expect(ctx.goals).toEqual({
      total: 0,
      byStatus: { on_track: 0, behind: 0, completed: 0, overdue: 0 },
      combinedProgressPercentage: 0,
      goals: [],
    });
    expect(ctx.dataQuality).toEqual({
      hasTransactions: false,
      hasGoals: false,
      monthsOfHistory: 0,
    });
  });

  it('summarizes the current month, compares to the previous month, and includes goals', async () => {
    const { clerkId } = { clerkId: CLERK };

    await Transaction.insertMany([
      { clerkId, type: 'income', amountPaise: 150000, category: 'salary', date: '2026-08-05T12:00:00.000Z' },
      { clerkId, type: 'expense', amountPaise: 60000, category: 'food', date: '2026-08-06T12:00:00.000Z' },
      { clerkId, type: 'expense', amountPaise: 20000, category: 'transport', date: '2026-08-12T12:00:00.000Z' },
      { clerkId, type: 'income', amountPaise: 100000, category: 'salary', date: '2026-07-05T12:00:00.000Z' },
      { clerkId, type: 'expense', amountPaise: 50000, category: 'food', date: '2026-07-06T12:00:00.000Z' },
    ]);

    await Goal.insertMany([
      {
        clerkId,
        name: 'Emergency Fund',
        targetAmountPaise: 100000,
        currentAmountPaise: 50000,
        deadline: null,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      {
        clerkId,
        name: 'New Laptop',
        targetAmountPaise: 80000,
        currentAmountPaise: 80000,
        deadline: null,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      {
        clerkId,
        name: 'Missed Trip',
        targetAmountPaise: 100000,
        currentAmountPaise: 20000,
        deadline: '2026-05-01T00:00:00.000Z',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ]);

    const ctx = await buildFinancialContext(CLERK, NOW);

    // Current-month summary (integer paise).
    expect(ctx.summary).toEqual({
      incomePaise: 150000,
      expensePaise: 80000,
      savingsPaise: 70000,
      savingsRate: 46.67,
      balancePaise: 70000,
      transactionCount: 3,
    });

    // Comparison vs the immediately previous calendar month.
    expect(ctx.comparison).toEqual({
      incomeChangePercent: 50,
      expenseChangePercent: 60,
      savingsChangePercent: 40,
    });

    // Top spending categories (desc, with percentage).
    expect(ctx.topSpendingCategories).toEqual([
      { category: 'food', amountPaise: 60000, percentage: 75 },
      { category: 'transport', amountPaise: 20000, percentage: 25 },
    ]);
    expect(ctx.incomeCategories).toEqual([
      { category: 'salary', amountPaise: 150000, percentage: 100 },
    ]);

    // Largest expense — category/amount/date only; no raw description.
    expect(ctx.largestExpense).toEqual({
      amountPaise: 60000,
      category: 'food',
      dateIso: '2026-08-06T12:00:00.000Z',
    });

    // Per-category trend across the trailing 6 months.
    const food = ctx.categoryTrends.find((t) => t.category === 'food')!;
    expect(food.months).toHaveLength(6);
    expect(food.months[0]).toEqual({ month: '2026-03', amountPaise: 0 });
    expect(food.months[4]).toEqual({ month: '2026-07', amountPaise: 50000 });
    expect(food.months[5]).toEqual({ month: '2026-08', amountPaise: 60000 });
    const transport = ctx.categoryTrends.find((t) => t.category === 'transport')!;
    expect(transport.months[5]).toEqual({ month: '2026-08', amountPaise: 20000 });

    // 6-month trend buckets.
    expect(ctx.monthlyTrend).toHaveLength(6);
    const july = ctx.monthlyTrend.find((m) => m.month === '2026-07')!;
    const august = ctx.monthlyTrend.find((m) => m.month === '2026-08')!;
    expect(july).toEqual({ month: '2026-07', incomePaise: 100000, expensePaise: 50000, savingsPaise: 50000 });
    expect(august).toEqual({ month: '2026-08', incomePaise: 150000, expensePaise: 80000, savingsPaise: 70000 });

    // Goals with backend status math.
    expect(ctx.goals.total).toBe(3);
    expect(ctx.goals.byStatus).toEqual({ on_track: 1, behind: 0, completed: 1, overdue: 1 });
    expect(ctx.goals.combinedProgressPercentage).toBe(53.57);
    const emergency = ctx.goals.goals.find((g) => g.name === 'Emergency Fund')!;
    expect(emergency.status).toBe('on_track');
    expect(emergency.progressPercentage).toBe(50);

    expect(ctx.dataQuality).toEqual({
      hasTransactions: true,
      hasGoals: true,
      monthsOfHistory: 2,
    });
  });
});