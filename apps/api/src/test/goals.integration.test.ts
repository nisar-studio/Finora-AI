import { Application } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { User } from '../models/User.model.js';
import { Goal } from '../modules/goals/goals.model.js';
import { signSessionToken, VALID_KEYPAIR } from './test-keys.js';

let app: Application;

const DAY_MS = 86_400_000;
const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString();
const longAgo = (): string => new Date(Date.now() - 90 * DAY_MS).toISOString();

beforeAll(async () => {
  await connectMongo();
  app = createApp();
});

afterAll(async () => {
  await Goal.deleteMany({});
  await User.deleteMany({});
  await disconnectMongo();
});

beforeEach(async () => {
  await Goal.deleteMany({});
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

const validGoal = {
  name: 'Emergency Fund',
  targetAmountPaise: 500000,
  currentAmountPaise: 120000,
};

describe('goals — authentication', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const targets: { method: Method; path: string }[] = [
      { method: 'post', path: '/api/v1/goals' },
      { method: 'get', path: '/api/v1/goals' },
      { method: 'get', path: '/api/v1/goals/5f8f8f8f8f8f8f8f8f8f8f8f' },
      { method: 'patch', path: '/api/v1/goals/5f8f8f8f8f8f8f8f8f8f8f8f' },
      { method: 'delete', path: '/api/v1/goals/5f8f8f8f8f8f8f8f8f8f8f8f' },
    ];

    for (const target of targets) {
      const res = await rawRequest(target.method, target.path).set('accept', 'application/json');
      expect(res.status, `${target.method} ${target.path}`).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('goals — create', () => {
  it('creates an open-ended goal for the authenticated user', async () => {
    const token = tokenFor('user_2goal');
    const res = await bearer(token).post('/api/v1/goals').send(validGoal);

    expect(res.status).toBe(201);
    expect(res.body.goal).toMatchObject({
      clerkId: 'user_2goal',
      name: 'Emergency Fund',
      targetAmountPaise: 500000,
      currentAmountPaise: 120000,
      deadline: null,
      autosaveEnabled: false,
      progress: {
        progressPercentage: 24,
        remainingPaise: 380000,
        daysRemaining: null,
        requiredMonthlySavingsPaise: null,
        status: 'on_track',
      },
    });
    expect(res.body.goal.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('defaults the saved amount to zero', async () => {
    const res = await bearer(tokenFor('user_2goal'))
      .post('/api/v1/goals')
      .send({ name: 'Vacation', targetAmountPaise: 200000 });
    expect(res.status).toBe(201);
    expect(res.body.goal.currentAmountPaise).toBe(0);
    expect(res.body.goal.progress.progressPercentage).toBe(0);
  });

  it('accepts a future deadline and computes pace', async () => {
    const deadline = inDays(90);
    const res = await bearer(tokenFor('user_2goal'))
      .post('/api/v1/goals')
      .send({
        name: 'New Bike',
        targetAmountPaise: 130000,
        currentAmountPaise: 10000,
        autosaveEnabled: true,
        deadline,
      });

    expect(res.status).toBe(201);
    expect(res.body.goal.deadline).toBe(deadline);
    expect(res.body.goal.autosaveEnabled).toBe(true);
    expect(res.body.goal.progress.daysRemaining).toBe(90);
    expect(res.body.goal.progress.requiredMonthlySavingsPaise).toBe(40000);
  });

  it('marks an already-funded goal as completed', async () => {
    const res = await bearer(tokenFor('user_2goal'))
      .post('/api/v1/goals')
      .send({ name: 'Done', targetAmountPaise: 10000, currentAmountPaise: 10000, deadline: inDays(30) });

    expect(res.status).toBe(201);
    expect(res.body.goal.progress.status).toBe('completed');
    expect(res.body.goal.progress.progressPercentage).toBe(100);
    expect(res.body.goal.progress.requiredMonthlySavingsPaise).toBe(0);
  });

  it('rejects invalid payloads with 400', async () => {
    const token = tokenFor('user_2goal');
    const cases = [
      { name: '', targetAmountPaise: 1000 },
      { name: 'x'.repeat(81), targetAmountPaise: 1000 },
      { name: 'Goal', targetAmountPaise: 0 },
      { name: 'Goal', targetAmountPaise: -5 },
      { name: 'Goal', targetAmountPaise: 10.5 },
      { name: 'Goal', targetAmountPaise: 1000, currentAmountPaise: 2000 }, // current > target
      { name: 'Goal', targetAmountPaise: 1000, currentAmountPaise: -1 },
      { name: 'Goal', targetAmountPaise: 1000, deadline: 'not-a-date' },
      { name: 'Goal', targetAmountPaise: 1000, deadline: longAgo() }, // past deadline
      { name: 'Goal', targetAmountPaise: 1000, autosaveEnabled: 'yes' },
    ];

    for (const bad of cases) {
      const res = await bearer(token).post('/api/v1/goals').send(bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('goals — get / list', () => {
  it('returns a single goal by id', async () => {
    const token = tokenFor('user_2list');
    const created = await bearer(token).post('/api/v1/goals').send(validGoal);
    const id = created.body.goal.id;

    const res = await bearer(token).get(`/api/v1/goals/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.goal.id).toBe(id);
    expect(res.body.goal.name).toBe('Emergency Fund');
  });

  it('returns 404 for an unknown goal id', async () => {
    const res = await bearer(tokenFor('user_2list')).get('/api/v1/goals/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed goal id', async () => {
    const res = await bearer(tokenFor('user_2list')).get('/api/v1/goals/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists goal ids newest first, scoped to the user', async () => {
    const clerkId = 'user_2list';
    const token = tokenFor(clerkId);

    await Goal.insertMany([
      { clerkId, name: 'A', targetAmountPaise: 100, createdAt: new Date('2026-07-01T00:00:00.000Z') },
      { clerkId, name: 'B', targetAmountPaise: 200, createdAt: new Date('2026-07-02T00:00:00.000Z') },
      { clerkId, name: 'C', targetAmountPaise: 300, createdAt: new Date('2026-07-03T00:00:00.000Z') },
      { clerkId: 'user_2other', name: 'D', targetAmountPaise: 999, createdAt: new Date('2026-07-04T00:00:00.000Z') },
    ]);

    const res = await bearer(token).get('/api/v1/goals');
    expect(res.status).toBe(200);
    const names = res.body.goals.map((g: { name: string }) => g.name);
    expect(names).toEqual(['C', 'B', 'A']);
  });

  it('returns an empty list for a fresh user', async () => {
    const res = await bearer(tokenFor('user_2empty')).get('/api/v1/goals');
    expect(res.status).toBe(200);
    expect(res.body.goals).toEqual([]);
  });

  it('reports an overdue goal that was seeded with a past deadline', async () => {
    await Goal.insertMany([
      {
        clerkId: 'user_2overdue',
        name: 'Missed',
        targetAmountPaise: 100000,
        currentAmountPaise: 10000,
        deadline: new Date(longAgo()),
      },
    ]);
    const res = await bearer(tokenFor('user_2overdue')).get('/api/v1/goals');
    expect(res.status).toBe(200);

    const progress = res.body.goals[0].progress;
    expect(progress.status).toBe('overdue');
    expect(progress.daysRemaining).toBe(0);
    expect(progress.requiredMonthlySavingsPaise).toBeNull();
  });
});

describe('goals — update', () => {
  it('updates a goal owned by the user', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/goals').send(validGoal);
    const id = created.body.goal.id;

    const res = await bearer(token)
      .patch(`/api/v1/goals/${id}`)
      .send({ name: 'Rainy Day Fund', currentAmountPaise: 250000, autosaveEnabled: true });

    expect(res.status).toBe(200);
    expect(res.body.goal).toMatchObject({
      id,
      name: 'Rainy Day Fund',
      currentAmountPaise: 250000,
      autosaveEnabled: true,
    });
    expect(res.body.goal.progress.progressPercentage).toBe(50);
  });

  it('clears a deadline with null', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/goals').send({
      ...validGoal,
      deadline: inDays(30),
    });
    const id = created.body.goal.id;

    const res = await bearer(token).patch(`/api/v1/goals/${id}`).send({ deadline: null });
    expect(res.status).toBe(200);
    expect(res.body.goal.deadline).toBeNull();
    expect(res.body.goal.progress.daysRemaining).toBeNull();
  });

  it('rejects updating an unknown goal with 404', async () => {
    const res = await bearer(tokenFor('user_2update'))
      .patch('/api/v1/goals/507f1f77bcf86cd799439011')
      .send({ name: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('rejects updating with an empty body', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/goals').send(validGoal);
    const res = await bearer(token).patch(`/api/v1/goals/${created.body.goal.id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid patch body with 400', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/goals').send(validGoal);
    const id = created.body.goal.id;

    const cases = [
      { name: '' },
      { targetAmountPaise: 0 },
      { currentAmountPaise: -1 },
      { deadline: longAgo() },
      { autosaveEnabled: 'yes' },
    ];

    for (const bad of cases) {
      const res = await bearer(token).patch(`/api/v1/goals/${id}`).send(bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('validates the merged state: shrinking target below current is rejected', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/goals').send({
      name: 'Goal',
      targetAmountPaise: 10000,
      currentAmountPaise: 5000,
    });
    const id = created.body.goal.id;

    // Patch alone is valid (target 4000), but merges to current 5000 > target 4000.
    const res = await bearer(token).patch(`/api/v1/goals/${id}`).send({ targetAmountPaise: 4000 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects raising the saved amount above the target', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/goals').send({
      name: 'Goal',
      targetAmountPaise: 10000,
      currentAmountPaise: 5000,
    });
    const id = created.body.goal.id;

    const res = await bearer(token).patch(`/api/v1/goals/${id}`).send({ currentAmountPaise: 15000 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts a patch whose merged state is valid', async () => {
    const token = tokenFor('user_2update');
    const created = await bearer(token).post('/api/v1/goals').send({
      name: 'Goal',
      targetAmountPaise: 10000,
      currentAmountPaise: 5000,
    });
    const id = created.body.goal.id;

    const res = await bearer(token).patch(`/api/v1/goals/${id}`).send({ targetAmountPaise: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.goal.targetAmountPaise).toBe(5000);
    expect(res.body.goal.progress.status).toBe('completed');
  });
});

describe('goals — delete', () => {
  it('deletes a goal owned by the user', async () => {
    const token = tokenFor('user_2delete');
    const created = await bearer(token).post('/api/v1/goals').send(validGoal);
    const id = created.body.goal.id;

    const del = await bearer(token).delete(`/api/v1/goals/${id}`);
    expect(del.status).toBe(204);

    const gone = await bearer(token).get(`/api/v1/goals/${id}`);
    expect(gone.status).toBe(404);
  });

  it('returns 404 when deleting an unknown goal', async () => {
    const res = await bearer(tokenFor('user_2delete')).delete('/api/v1/goals/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});

describe('goals — user isolation', () => {
  it('never exposes another user\'s goals', async () => {
    const tokenA = tokenFor('user_2alice');
    const tokenB = tokenFor('user_2mallory');

    const created = await bearer(tokenA).post('/api/v1/goals').send(validGoal);
    const lockedId = created.body.goal.id;

    const list = await bearer(tokenB).get('/api/v1/goals');
    expect(list.status).toBe(200);
    expect(list.body.goals).toHaveLength(0);

    const read = await bearer(tokenB).get(`/api/v1/goals/${lockedId}`);
    expect(read.status).toBe(404);

    const update = await bearer(tokenB).patch(`/api/v1/goals/${lockedId}`).send({ name: 'Hijacked' });
    expect(update.status).toBe(404);

    const remove = await bearer(tokenB).delete(`/api/v1/goals/${lockedId}`);
    expect(remove.status).toBe(404);

    const aliceRead = await bearer(tokenA).get(`/api/v1/goals/${lockedId}`);
    expect(aliceRead.status).toBe(200);
    expect(aliceRead.body.goal.name).toBe('Emergency Fund');
  });
});