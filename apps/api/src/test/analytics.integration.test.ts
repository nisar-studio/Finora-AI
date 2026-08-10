import { Application } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { User } from '../models/User.model.js';
import { Transaction } from '../models/Transaction.model.js';
import { signSessionToken, VALID_KEYPAIR } from './test-keys.js';

let app: Application;

const JUL1 = '2026-07-01T00:00:00.000Z';
const JUL31 = '2026-07-31T23:59:59.999Z';
const JUNE5 = '2026-06-05T00:00:00.000Z';
const AUG10 = '2026-08-10T00:00:00.000Z';

beforeAll(async () => {
  await connectMongo();
  app = createApp();
});

afterAll(async () => {
  await Transaction.deleteMany({});
  await User.deleteMany({});
  await disconnectMongo();
});

beforeEach(async () => {
  await Transaction.deleteMany({});
  await User.deleteMany({});
});

const tokenFor = (sub: string): string => signSessionToken(VALID_KEYPAIR.privateKey, { sub });

const bearer = (token: string) => ({
  get: (path: string) =>
    request(app).get(path).set('authorization', `Bearer ${token}`).set('accept', 'application/json'),
});

interface Seed {
  type: 'income' | 'expense';
  amountPaise: number;
  category: string;
  date: string;
  description?: string;
}

async function seed(clerkId: string, items: Seed[]): Promise<void> {
  await Transaction.insertMany(items.map((item) => ({ clerkId, source: 'manual', ...item })));
}

const julyWindow = { from: JUL1, to: JUL31 };

type SummaryBody = {
  summary: {
    balancePaise: number;
    incomePaise: number;
    expensePaise: number;
    savingsPaise: number;
    savingsRate: number;
    transactionCount: number;
  };
};

function summaryOf(body: SummaryBody) {
  return body.summary;
}

describe('analytics — authentication & validation', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/analytics/summary').set('accept', 'application/json');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects from > to with 400', async () => {
    const res = await bearer(tokenFor('user_2anl'))
      .get('/api/v1/analytics/summary')
      .query({ from: '2026-07-31T00:00:00.000Z', to: '2026-07-01T00:00:00.000Z' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed dates with 400', async () => {
    const res = await bearer(tokenFor('user_2anl'))
      .get('/api/v1/analytics/summary')
      .query({ from: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('analytics — summary scenarios', () => {
  it('returns a zero summary for an empty account', async () => {
    const res = await bearer(tokenFor('user_2empty')).get('/api/v1/analytics/summary').query(julyWindow);
    expect(res.status).toBe(200);

    expect(summaryOf(res.body)).toEqual({
      balancePaise: 0,
      incomePaise: 0,
      expensePaise: 0,
      savingsPaise: 0,
      savingsRate: 0,
      transactionCount: 0,
    });
    expect(res.body.comparison).toEqual({
      incomeChangePercent: null,
      expenseChangePercent: null,
      savingsChangePercent: null,
    });
    expect(res.body.categories).toEqual([]);
    expect(res.body.incomeCategories).toEqual([]);
    expect(res.body.monthlyTrend).toHaveLength(6);
    expect(res.body.largestExpense).toBeNull();
  });

  it('computes income-only metrics', async () => {
    await seed('user_2anl', [
      { type: 'income', amountPaise: 100000, category: 'salary', date: '2026-07-10T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);
    const s = summaryOf(res.body);

    expect(s.incomePaise).toBe(100000);
    expect(s.expensePaise).toBe(0);
    expect(s.balancePaise).toBe(100000);
    expect(s.savingsPaise).toBe(100000);
    expect(s.savingsRate).toBe(100);
    expect(s.transactionCount).toBe(1);
  });

  it('handles an expense-only account (zero savings rate)', async () => {
    await seed('user_2anl', [
      { type: 'expense', amountPaise: 50000, category: 'food', date: '2026-07-05T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);
    const s = summaryOf(res.body);

    expect(s.incomePaise).toBe(0);
    expect(s.expensePaise).toBe(50000);
    expect(s.balancePaise).toBe(-50000);
    expect(s.savingsRate).toBe(0);
    expect(s.transactionCount).toBe(1);
  });

  it('computes balance, savings and savings rate from income + expenses', async () => {
    await seed('user_2anl', [
      { type: 'income', amountPaise: 200000, category: 'salary', date: '2026-07-10T00:00:00.000Z' },
      { type: 'expense', amountPaise: 80000, category: 'food', date: '2026-07-12T00:00:00.000Z' },
      { type: 'expense', amountPaise: 20000, category: 'food', date: '2026-07-20T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);
    const s = summaryOf(res.body);

    expect(s).toMatchObject({
      incomePaise: 200000,
      expensePaise: 100000,
      balancePaise: 100000,
      savingsPaise: 100000,
      savingsRate: 50,
      transactionCount: 3,
    });
    expect(res.body.categories).toEqual([
      { category: 'food', amountPaise: 100000, percentage: 100 },
    ]);
    expect(res.body.incomeCategories).toEqual([
      { category: 'salary', amountPaise: 200000, percentage: 100 },
    ]);
    expect(res.body.largestExpense).toMatchObject({
      amountPaise: 80000,
      category: 'food',
      description: '',
    });
  });
});

describe('analytics — aggregation, trend, comparison, isolation', () => {
  it('aggregates expense/income categories with percentages', async () => {
    await seed('user_2anl', [
      { type: 'expense', amountPaise: 60000, category: 'food', date: '2026-07-03T00:00:00.000Z' },
      { type: 'expense', amountPaise: 40000, category: 'transport', date: '2026-07-04T00:00:00.000Z' },
      { type: 'income', amountPaise: 150000, category: 'salary', date: '2026-07-05T00:00:00.000Z' },
      { type: 'income', amountPaise: 50000, category: 'freelance', date: '2026-07-06T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);

    expect(res.body.categories).toEqual([
      { category: 'food', amountPaise: 60000, percentage: 60 },
      { category: 'transport', amountPaise: 40000, percentage: 40 },
    ]);
    expect(res.body.incomeCategories).toEqual([
      { category: 'salary', amountPaise: 150000, percentage: 75 },
      { category: 'freelance', amountPaise: 50000, percentage: 25 },
    ]);
  });

  it('builds a zero-filled 6-month trend and buckets transactions', async () => {
    await seed('user_2anl', [
      { type: 'income', amountPaise: 50000, category: 'salary', date: JUNE5 },
      { type: 'expense', amountPaise: 30000, category: 'food', date: JUNE5 },
      { type: 'income', amountPaise: 90000, category: 'salary', date: '2026-07-15T00:00:00.000Z' },
      { type: 'expense', amountPaise: 40000, category: 'food', date: '2026-07-16T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);
    const trend = res.body.monthlyTrend as {
      month: string;
      incomePaise: number;
      expensePaise: number;
      savingsPaise: number;
    }[];

    expect(trend).toHaveLength(6);
    const june = trend.find((t) => t.month === '2026-06');
    const july = trend.find((t) => t.month === '2026-07');
    expect(june).toEqual({ month: '2026-06', incomePaise: 50000, expensePaise: 30000, savingsPaise: 20000 });
    expect(july).toEqual({ month: '2026-07', incomePaise: 90000, expensePaise: 40000, savingsPaise: 50000 });
  });

  it('compares the current window with the previous window', async () => {
    await seed('user_2anl', [
      { type: 'expense', amountPaise: 40000, category: 'food', date: JUNE5 },
      { type: 'income', amountPaise: 100000, category: 'salary', date: JUNE5 },
      { type: 'expense', amountPaise: 60000, category: 'food', date: '2026-07-05T00:00:00.000Z' },
      { type: 'income', amountPaise: 150000, category: 'salary', date: '2026-07-06T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);

    expect(res.body.comparison).toEqual({
      incomeChangePercent: 50,
      expenseChangePercent: 50,
      savingsChangePercent: 50,
    });
  });

  it('returns null changes when the previous period had no values', async () => {
    await seed('user_2anl', [
      { type: 'income', amountPaise: 200000, category: 'salary', date: '2026-07-02T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);

    expect(res.body.comparison).toEqual({
      incomeChangePercent: null,
      expenseChangePercent: null,
      savingsChangePercent: null,
    });
  });

  it('exposes the largest expense transaction', async () => {
    await seed('user_2anl', [
      { type: 'expense', amountPaise: 1200, category: 'food', date: '2026-07-02T00:00:00.000Z', description: 'snack' },
      { type: 'expense', amountPaise: 60000, category: 'housing', date: '2026-07-03T00:00:00.000Z', description: 'July rent' },
      { type: 'expense', amountPaise: 8000, category: 'transport', date: '2026-07-04T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);

    expect(res.body.largestExpense).toMatchObject({
      amountPaise: 60000,
      category: 'housing',
      description: 'July rent',
      date: '2026-07-03T00:00:00.000Z',
    });
  });

  it('counts transactions and ignores those outside the date filter', async () => {
    await seed('user_2anl', [
      { type: 'expense', amountPaise: 10000, category: 'food', date: '2026-07-10T00:00:00.000Z' },
      { type: 'expense', amountPaise: 20000, category: 'food', date: AUG10 },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary').query(julyWindow);

    expect(summaryOf(res.body).transactionCount).toBe(1);
    expect(summaryOf(res.body).expensePaise).toBe(10000);
  });

  it('uses the current month as the default window', async () => {
    const now = new Date();
    const currentMonthDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) + 86400000
    );
    const previousMonthDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
    await seed('user_2anl', [
      { type: 'income', amountPaise: 77777, category: 'salary', date: currentMonthDay.toISOString() },
      { type: 'expense', amountPaise: 33333, category: 'food', date: previousMonthDay.toISOString() },
    ]);
    const res = await bearer(tokenFor('user_2anl')).get('/api/v1/analytics/summary');

    const s = summaryOf(res.body);
    expect(s.transactionCount).toBe(1);
    expect(s.incomePaise).toBe(77777);
    expect(s.expensePaise).toBe(0);
    // Comparison is available because the previous month had a transaction.
    expect(res.body.comparison.expenseChangePercent).not.toBeNull();
  });

  it('never exposes another user\'s analytics', async () => {
    await seed('user_2alice', [
      { type: 'income', amountPaise: 500000, category: 'salary', date: '2026-07-01T00:00:00.000Z' },
    ]);
    const res = await bearer(tokenFor('user_2mallory')).get('/api/v1/analytics/summary').query(julyWindow);

    expect(res.status).toBe(200);
    expect(summaryOf(res.body)).toMatchObject({
      incomePaise: 0,
      expensePaise: 0,
      transactionCount: 0,
    });
    expect(res.body.largestExpense).toBeNull();
  });
});