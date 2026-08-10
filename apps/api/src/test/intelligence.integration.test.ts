import { Application } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { User } from '../models/User.model.js';
import { Transaction } from '../models/Transaction.model.js';
import { signSessionToken, VALID_KEYPAIR } from './test-keys.js';
import {
  MlFeatureTransaction,
  MlFinancialIntelligenceResult,
  MlServiceClient,
  MlServiceUnavailableError,
} from '../services/mlClient.service.js';
import { setMlClient } from '../modules/intelligence/intelligence.service.js';

// The Python ML service is mocked ONLY at the network boundary (MlServiceClient).
// The real Node logic (scoped query, feature transformation, response schema
// validation, graceful degradation) runs against the fake client.
const fakeClient = {
  calls: [] as unknown[][],
  result: null as unknown,
  throwError: null as Error | null,
} as unknown as {
  calls: unknown[][];
  result: unknown;
  throwError: Error | null;
  getFinancialIntelligence: (history: MlFeatureTransaction[]) => Promise<MlFinancialIntelligenceResult>;
};

fakeClient.getFinancialIntelligence = async (history: MlFeatureTransaction[]) => {
  fakeClient.calls.push(history);
  if (fakeClient.throwError) {
    throw fakeClient.throwError;
  }
  return fakeClient.result as MlFinancialIntelligenceResult;
};

const ML_RESULT = {
  modelVersion: 'v1',
  dataQuality: {
    transactionCount: 2,
    expenseCount: 1,
    monthsAvailable: 1,
    sufficientHistory: false,
  },
  risk: { score: 12.5, level: 'low' },
  forecast: { nextMonthExpensePaise: 1200, confidence: 0.3 },
  anomalies: [],
  patterns: [],
};

let app: Application;

beforeAll(async () => {
  await connectMongo();
  app = createApp();
});

afterAll(async () => {
  await Transaction.deleteMany({});
  await User.deleteMany({});
  setMlClient(undefined);
  await disconnectMongo();
});

beforeEach(async () => {
  await Transaction.deleteMany({});
  await User.deleteMany({});
  fakeClient.calls.length = 0;
  fakeClient.result = ML_RESULT;
  fakeClient.throwError = null;
  setMlClient(fakeClient as unknown as MlServiceClient);
});

const tokenFor = (sub: string): string => signSessionToken(VALID_KEYPAIR.privateKey, { sub });

const bearer = (token: string) => ({
  get: (path: string) =>
    request(app).get(path).set('authorization', `Bearer ${token}`).set('accept', 'application/json'),
});

describe('intelligence — authentication & validation', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/intelligence').set('accept', 'application/json');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects months outside the allowed range', async () => {
    const token = tokenFor('user_2intel');
    for (const months of ['0', '37', '-1', 'abc']) {
      const res = await bearer(token).get('/api/v1/intelligence').query({ months });
      expect(res.status, months).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('intelligence — happy path & isolation', () => {
  it('returns the validated ML result for the authenticated user', async () => {
    const clerkId = 'user_2intel';
    const token = tokenFor(clerkId);
    await Transaction.insertMany([
      { clerkId, type: 'expense', amountPaise: 1000, category: 'food', date: new Date('2026-07-04T00:00:00.000Z') },
      { clerkId, type: 'income', amountPaise: 50000, category: 'salary', date: new Date('2026-07-05T00:00:00.000Z') },
    ]);

    const res = await bearer(token).get('/api/v1/intelligence');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(ML_RESULT);

    // The feature payload sent to Python contains this user's history and
    // nothing else - no clerkId, no tokens, no emails.
    const sent = fakeClient.calls[0] as Array<{ type: string; category: string; amountPaise: number; date: string }>;
    expect(Array.isArray(sent)).toBe(true);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toEqual({
      type: 'expense',
      category: 'food',
      amountPaise: 1000,
      date: '2026-07-04',
    });
    const serialized = JSON.stringify(sent);
    expect(serialized).not.toContain(clerkId);
    expect(serialized).not.toContain('clerkId');
    expect(serialized).not.toContain('Bearer');
  });

  it('never sends another user\'s data to the ML service', async () => {
    const alice = 'user_2alice';
    const mallory = 'user_2mallory';

    await Transaction.insertMany([
      { clerkId: mallory, type: 'expense', amountPaise: 99999999, category: 'housing', date: new Date('2026-07-01T00:00:00.000Z') },
    ]);
    await Transaction.insertMany([
      { clerkId: alice, type: 'expense', amountPaise: 200, category: 'food', date: new Date('2026-07-02T00:00:00.000Z') },
    ]);

    await bearer(tokenFor(alice)).get('/api/v1/intelligence');

    const sent = JSON.stringify(fakeClient.calls[0]);
    expect(sent).toContain('"amountPaise":200');
    expect(sent).not.toContain('99999999');
    expect(sent).not.toContain('housing');
    expect(sent).not.toContain('mallory');
  });

  it('filters to the trailing window requested by the client', async () => {
    const clerkId = 'user_2window';
    const token = tokenFor(clerkId);
    await Transaction.insertMany([
      { clerkId, type: 'expense', amountPaise: 100, category: 'food', date: new Date('2026-01-10T00:00:00.000Z') },
      { clerkId, type: 'expense', amountPaise: 200, category: 'food', date: new Date('2026-07-10T00:00:00.000Z') },
    ]);

    await bearer(token).get('/api/v1/intelligence').query({ months: 3 });

    const sent = JSON.stringify(fakeClient.calls[0]);
    expect(sent).toContain('"amountPaise":200');
    expect(sent).not.toContain('"amountPaise":100');
  });
});

describe('intelligence — graceful degradation', () => {
  it('returns 503 when the ML service is not configured', async () => {
    setMlClient(null);
    const token = tokenFor('user_2none');

    const res = await bearer(token).get('/api/v1/intelligence');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ML_SERVICE_UNAVAILABLE');
  });

  it('returns 503 (not a crash) when the ML service throws a typed error', async () => {
    fakeClient.throwError = new MlServiceUnavailableError('ML service unreachable.');
    const token = tokenFor('user_2down');

    const res = await bearer(token).get('/api/v1/intelligence');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ML_SERVICE_UNAVAILABLE');
    // Internal infrastructure details must not leak to the browser.
    expect(JSON.stringify(res.body)).not.toContain('localhost');
    expect(JSON.stringify(res.body)).not.toContain('x-ml-api-key');
    expect(JSON.stringify(res.body)).not.toContain('unreachable');
  });

  it('rejects a malformed ML response instead of breaking the API', async () => {
    fakeClient.result = { totally: 'wrong shape' };
    const token = tokenFor('user_2bad');

    const res = await bearer(token).get('/api/v1/intelligence');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('ML_INVALID_RESPONSE');
  });

  it('still works when a later request is valid again (stateless recovery)', async () => {
    const clerkId = 'user_2recover';
    const token = tokenFor(clerkId);
    await Transaction.insertMany([
      { clerkId, type: 'expense', amountPaise: 300, category: 'food', date: new Date('2026-07-01T00:00:00.000Z') },
    ]);

    fakeClient.throwError = new MlServiceUnavailableError('down');
    expect((await bearer(token).get('/api/v1/intelligence')).status).toBe(503);

    fakeClient.throwError = null;
    const res = await bearer(token).get('/api/v1/intelligence');
    expect(res.status).toBe(200);
  });
});