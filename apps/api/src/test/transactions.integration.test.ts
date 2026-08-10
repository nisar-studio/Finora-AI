import { Application } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { User } from '../models/User.model.js';
import { Transaction } from '../models/Transaction.model.js';
import { signSessionToken, VALID_KEYPAIR } from './test-keys.js';

let app: Application;

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
  post: (path: string) =>
    request(app).post(path).set('authorization', `Bearer ${token}`).set('accept', 'application/json'),
  get: (path: string) =>
    request(app).get(path).set('authorization', `Bearer ${token}`).set('accept', 'application/json'),
  patch: (path: string) =>
    request(app).patch(path).set('authorization', `Bearer ${token}`).set('accept', 'application/json'),
  delete: (path: string) =>
    request(app).delete(path).set('authorization', `Bearer ${token}`).set('accept', 'application/json'),
});

type Method = 'post' | 'get' | 'patch' | 'delete';

function rawRequest(method: Method, path: string): request.Test {
  switch (method) {
    case 'post':
      return request(app).post(path);
    case 'get':
      return request(app).get(path);
    case 'patch':
      return request(app).patch(path);
    case 'delete':
      return request(app).delete(path);
  }
}

describe('transactions — authentication', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const targets: { method: Method; path: string }[] = [
      { method: 'post', path: '/api/v1/transactions' },
      { method: 'get', path: '/api/v1/transactions' },
      { method: 'get', path: '/api/v1/transactions/5f8f8f8f8f8f8f8f8f8f8f8f' },
      { method: 'patch', path: '/api/v1/transactions/5f8f8f8f8f8f8f8f8f8f8f8f' },
      { method: 'delete', path: '/api/v1/transactions/5f8f8f8f8f8f8f8f8f8f8f8f' },
    ];

    for (const target of targets) {
      const res = await rawRequest(target.method, target.path).set('accept', 'application/json');
      expect(res.status, `${target.method} ${target.path}`).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
});

const validTx = {
  type: 'expense',
  amountPaise: 125000,
  category: 'food',
  description: 'Dinner at AGRA',
  date: '2026-07-30T18:30:00.000Z',
};

describe('transactions — create', () => {
  it('creates a manual transaction for the authenticated user', async () => {
    const token = tokenFor('user_2txn');
    const res = await bearer(token).post('/api/v1/transactions').send(validTx);

    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({
      clerkId: 'user_2txn',
      type: 'expense',
      amountPaise: 125000,
      category: 'food',
      source: 'manual',
      description: 'Dinner at AGRA',
    });
    expect(res.body.transaction.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('rejects invalid payloads with 400', async () => {
    const token = tokenFor('user_2txn');
    const cases = [
      { ...validTx, amountPaise: -5 },
      { ...validTx, amountPaise: 0 },
      { ...validTx, amountPaise: 1.5 },
      { ...validTx, type: 'transfer' },
      { ...validTx, category: 'crypto' },
      { ...validTx, date: '2026-13-40' },
    ];

    for (const bad of cases) {
      const res = await bearer(token).post('/api/v1/transactions').send(bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('transactions — get / list / filters', () => {
  it('returns a single transaction by id', async () => {
    const token = tokenFor('user_2list');
    const created = await bearer(token).post('/api/v1/transactions').send(validTx);
    const id = created.body.transaction.id;

    const res = await bearer(token).get(`/api/v1/transactions/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.transaction.id).toBe(id);
  });

  it('returns 404 for an unknown transaction id', async () => {
    const res = await bearer(tokenFor('user_2list'))
      .get('/api/v1/transactions/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed transaction id', async () => {
    const res = await bearer(tokenFor('user_2list')).get('/api/v1/transactions/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists transactions newest first, scoped to the user', async () => {
    const clerkId = 'user_2list';
    const token = tokenFor(clerkId);

    await Transaction.insertMany([
      { clerkId, type: 'expense', amountPaise: 100, category: 'food', date: '2026-07-01' },
      { clerkId, type: 'expense', amountPaise: 200, category: 'food', date: '2026-07-02' },
      { clerkId, type: 'income', amountPaise: 300, category: 'salary', date: '2026-07-03' },
      { clerkId: 'user_2other', type: 'expense', amountPaise: 999, category: 'food', date: '2026-07-04' },
    ]);

    const res = await bearer(token).get('/api/v1/transactions');
    expect(res.status).toBe(200);

    const ids = res.body.transactions.map((t: { id: string }) => t.id);
    expect(ids).toHaveLength(3);
    const dates = res.body.transactions.map((t: { date: string }) => t.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('filters by type, category, date range and paginates', async () => {
    const clerkId = 'user_2filter';
    const token = tokenFor(clerkId);

    await Transaction.insertMany([
      { clerkId, type: 'income', amountPaise: 100, category: 'salary', date: '2026-07-01' },
      { clerkId, type: 'expense', amountPaise: 200, category: 'food', date: '2026-07-02' },
      { clerkId, type: 'expense', amountPaise: 300, category: 'utilities', date: '2026-07-03' },
      { clerkId, type: 'income', amountPaise: 400, category: 'investment', date: '2026-07-04' },
      { clerkId, type: 'expense', amountPaise: 500, category: 'food', date: '2026-07-05' },
    ]);

    const byType = await bearer(token).get('/api/v1/transactions?type=expense');
    expect(byType.status).toBe(200);
    expect(byType.body.transactions.every((t: { type: string }) => t.type === 'expense')).toBe(true);

    const byCategory = await bearer(token).get('/api/v1/transactions?category=food');
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.transactions).toHaveLength(2);

    const byRange = await bearer(token)
      .get('/api/v1/transactions')
      .query('from=2026-07-02T00:00:00.000Z')
      .query('to=2026-07-03T23:59:59.999Z');
    expect(byRange.status).toBe(200);
    expect(byRange.body.transactions).toHaveLength(2);

    const page1 = await bearer(token)
      .get('/api/v1/transactions')
      .query('limit=2')
      .query('page=1');
    expect(page1.body.transactions).toHaveLength(2);
    expect(page1.body.pagination).toMatchObject({ page: 1, limit: 2, total: 5, hasMore: true });

    const page3 = await bearer(token)
      .get('/api/v1/transactions')
      .query('limit=2')
      .query('page=3');
    expect(page3.body.transactions).toHaveLength(1);
    expect(page3.body.pagination).toMatchObject({ page: 3, total: 5, hasMore: false });
  });
});

describe('transactions — update / delete', () => {
  it('updates a transaction owned by the user', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/transactions').send(validTx);
    const id = created.body.transaction.id;

    const res = await bearer(token)
      .patch(`/api/v1/transactions/${id}`)
      .send({ amountPaise: 99999, category: 'shopping' });

    expect(res.status).toBe(200);
    expect(res.body.transaction).toMatchObject({ id, amountPaise: 99999, category: 'shopping' });
  });

  it('returns 404 when updating an unknown transaction', async () => {
    const res = await bearer(tokenFor('user_2update'))
      .patch('/api/v1/transactions/507f1f77bcf86cd799439011')
      .send({ category: 'travel' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when updating with an empty body', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/transactions').send(validTx);
    const res = await bearer(token).patch(`/api/v1/transactions/${created.body.transaction.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('deletes a transaction owned by the user', async () => {
    const token = tokenFor('user_2delete');
    const created = await bearer(token).post('/api/v1/transactions').send(validTx);
    const id = created.body.transaction.id;

    const del = await bearer(token).delete(`/api/v1/transactions/${id}`);
    expect(del.status).toBe(204);

    const gone = await bearer(token).get(`/api/v1/transactions/${id}`);
    expect(gone.status).toBe(404);
  });

  it('returns 404 when deleting an unknown transaction', async () => {
    const res = await bearer(tokenFor('user_2delete'))
      .delete('/api/v1/transactions/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});

describe('transactions — user isolation', () => {
  it('never exposes another user\'s transactions', async () => {
    const tokenA = tokenFor('user_2alice');
    const tokenB = tokenFor('user_2mallory');

    const created = await bearer(tokenA).post('/api/v1/transactions').send(validTx);
    const lockedId = created.body.transaction.id;

    // Mallory's listing is empty.
    const list = await bearer(tokenB).get('/api/v1/transactions');
    expect(list.status).toBe(200);
    expect(list.body.transactions).toHaveLength(0);

    // Mallory cannot read, modify, or delete Alice's transaction: all 404.
    const read = await bearer(tokenB).get(`/api/v1/transactions/${lockedId}`);
    expect(read.status).toBe(404);

    const update = await bearer(tokenB)
      .patch(`/api/v1/transactions/${lockedId}`)
      .send({ amountPaise: 1 });
    expect(update.status).toBe(404);

    const remove = await bearer(tokenB).delete(`/api/v1/transactions/${lockedId}`);
    expect(remove.status).toBe(404);

    // Alice's transaction is untouched.
    const aliceRead = await bearer(tokenA).get(`/api/v1/transactions/${lockedId}`);
    expect(aliceRead.status).toBe(200);
    expect(aliceRead.body.transaction.amountPaise).toBe(125000);
  });
});