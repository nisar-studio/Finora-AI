import { Application } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { User } from '../models/User.model.js';
import { VALID_KEYPAIR, rogueKeyPair, signSessionToken } from './test-keys.js';

let app: Application;

beforeAll(async () => {
  await connectMongo();
  app = createApp();
});

afterAll(async () => {
  await User.deleteMany({});
  await disconnectMongo();
});

beforeEach(async () => {
  await User.deleteMany({});
});

const me = (token?: string) => {
  let req = request(app).get('/api/v1/users/me').set('accept', 'application/json');
  if (token) {
    req = req.set('authorization', `Bearer ${token}`);
  }
  return req;
};

describe('API foundation — public vs protected', () => {
  it('serves the public health endpoint without authentication', async () => {
    const res = await request(app).get('/api/v1/health').set('accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('finora-api');
  });

  it('rejects unauthenticated access to protected routes with 401', async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('Clerk session verification (network-less via CLERK_JWT_KEY)', () => {
  it('resolves the Clerk userId from a valid session token', async () => {
    const token = signSessionToken(VALID_KEYPAIR.privateKey, { sub: 'user_2testalpha' });
    const res = await me(token);

    expect(res.status).toBe(200);
    expect(res.body.user.clerkId).toBe('user_2testalpha');
  });

  it('rejects a token signed by an unknown key (401)', async () => {
    const token = signSessionToken(rogueKeyPair.privateKey, { sub: 'user_2rogue' });
    const res = await me(token);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an expired session token (401)', async () => {
    const token = signSessionToken(VALID_KEYPAIR.privateKey, {
      sub: 'user_2expired',
      exp: Math.floor(Date.now() / 1000) - 120,
    });
    const res = await me(token);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a malformed Bearer token (401)', async () => {
    const res = await me('not-a-real-jwt');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('lazy user creation', () => {
  it('creates exactly one user on the first authenticated request', async () => {
    const token = signSessionToken(VALID_KEYPAIR.privateKey, { sub: 'user_2lazytest' });

    const first = await me(token);
    const second = await me(token);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(second.body.user.clerkId).toBe('user_2lazytest');
    expect(await User.countDocuments({ clerkId: 'user_2lazytest' })).toBe(1);
  });

  it('defaults new users to INR currency and isolated per Clerk user', async () => {
    const tokenA = signSessionToken(VALID_KEYPAIR.privateKey, { sub: 'user_2scopedA' });
    const tokenB = signSessionToken(VALID_KEYPAIR.privateKey, { sub: 'user_2scopedB' });

    const resA = await me(tokenA);
    const resB = await me(tokenB);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resA.body.user.currency).toBe('INR');
    expect(resA.body.user.id).not.toBe(resB.body.user.id);
    expect(await User.countDocuments()).toBe(2);
  });
});