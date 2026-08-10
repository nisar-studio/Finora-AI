import express, { Application } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { User } from '../models/User.model.js';
import { Transaction } from '../models/Transaction.model.js';
import { Goal } from '../modules/goals/goals.model.js';
import { AiConversation } from '../models/AiConversation.model.js';
import { signSessionToken, VALID_KEYPAIR } from './test-keys.js';
import { createRateLimiter } from '../middleware/validate.js';

// Gemini is mocked ONLY at the external boundary (@google/genai). The real
// GeminiService (message mapping, system instruction, response parsing) runs.
const geminiState = vi.hoisted(() => ({
  nextText: '{"answer":"ok","suggestedQuestions":["a","b","c"]}',
  calls: [] as Array<{ contents: unknown; config: { systemInstruction?: string } }>,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (input: {
        contents: unknown;
        config: { systemInstruction?: string };
      }) => {
        geminiState.calls.push(input);
        return { text: geminiState.nextText };
      },
    };
  },
}));

let app: Application;

const SIGNED = '{"answer":"Focus on food spending","suggestedQuestions":["How can I cut food costs?","What is a good savings rate?","Should I grow my emergency fund?"]}';

beforeAll(async () => {
  await connectMongo();
  app = createApp();
});

afterAll(async () => {
  await AiConversation.deleteMany({});
  await Goal.deleteMany({});
  await Transaction.deleteMany({});
  await User.deleteMany({});
  await disconnectMongo();
});

beforeEach(async () => {
  await AiConversation.deleteMany({});
  await Goal.deleteMany({});
  await Transaction.deleteMany({});
  await User.deleteMany({});
  geminiState.calls.length = 0;
  geminiState.nextText = SIGNED;
});

const tokenFor = (sub: string): string => signSessionToken(VALID_KEYPAIR.privateKey, { sub });

const bearer = (token: string) => ({
  post: (path: string) =>
    request(app).post(path).set('authorization', `Bearer ${token}`).set('accept', 'application/json'),
});

const now = new Date();
const currentMonthIso = (day: number): string =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 12)).toISOString();

const lastGeminiCall = () => geminiState.calls[geminiState.calls.length - 1];

describe('coach — authentication & validation', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/v1/coach/query').set('accept', 'application/json');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects invalid questions with 400', async () => {
    const token = tokenFor('user_2coach');
    const cases = [
      {},
      { question: '' },
      { question: '   ' },
      { question: 'x'.repeat(1001) },
      { question: 42 },
    ];

    for (const bad of cases) {
      const res = await bearer(token).post('/api/v1/coach/query').send(bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('coach — query', () => {
  it('answers from the authenticated user\'s context and returns the response shape', async () => {
    const clerkId = 'user_2coach';
    const token = tokenFor(clerkId);

    await Transaction.insertMany([
      { clerkId, type: 'income', amountPaise: 200000, category: 'salary', date: currentMonthIso(3) },
      { clerkId, type: 'expense', amountPaise: 120000, category: 'food', date: currentMonthIso(4) },
      { clerkId, type: 'expense', amountPaise: 30000, category: 'transport', date: currentMonthIso(8) },
    ]);
    await Goal.insertMany([
      { clerkId, name: 'Emergency Fund', targetAmountPaise: 100000, currentAmountPaise: 50000 },
    ]);

    const res = await bearer(token)
      .post('/api/v1/coach/query')
      .send({ question: 'Where am I spending too much money?' });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['answer', 'sourcesUsed', 'suggestedQuestions']);
    expect(res.body.answer).toBe('Focus on food spending');
    expect(res.body.suggestedQuestions).toHaveLength(3);
    expect(res.body.sourcesUsed).toEqual(
      expect.arrayContaining(['current_month_summary', 'top_categories', 'savings_goals'])
    );

    // The prompt sent to Gemini carried only this user's deterministic context.
    const call = lastGeminiCall();
    expect(call).toBeDefined();
    const instruction = call!.config.systemInstruction ?? '';
    expect(JSON.stringify(call!.contents)).toContain('Where am I spending too much money?');
    expect(instruction).toContain('food');
    expect(instruction).toContain('120000');
    expect(instruction).toContain('Emergency Fund');
  });

  it('persists the conversation with messages, metadata and context hash', async () => {
    const clerkId = 'user_2persist';
    const token = tokenFor(clerkId);

    const res = await bearer(token)
      .post('/api/v1/coach/query')
      .send({ question: 'Should I start saving more?' });

    expect(res.status).toBe(200);

    const doc = await AiConversation.findOne({ clerkId }).lean();
    expect(doc).not.toBeNull();
    expect(doc!.question).toBe('Should I start saving more?');
    expect(doc!.answer).toBe('Focus on food spending');
    expect(doc!.messages).toHaveLength(2);
    expect(doc!.messages[0]).toMatchObject({
      role: 'user',
      content: 'Should I start saving more?',
    });
    expect(doc!.messages[1]).toMatchObject({ role: 'model', content: 'Focus on food spending' });
    expect(doc!.messages[1].timestamp).toBeDefined();
    expect(doc!.contextHash).toMatch(/^[0-9a-f]{64}$/);
    expect(doc!.promptVersion).toBe('v1');
    expect(doc!.model).toBe('gemini-3.6-flash');
  });

  it('never leaks another user\'s data into the context', async () => {
    const alice = 'user_2alice';
    const mallory = 'user_2mallory';

    // Mallory is rich: large housing expense and income.
    await Transaction.insertMany([
      { clerkId: mallory, type: 'income', amountPaise: 60000000, category: 'salary', date: currentMonthIso(2) },
      { clerkId: mallory, type: 'expense', amountPaise: 50000000, category: 'housing', date: currentMonthIso(5) },
    ]);
    // Alice has a single modest food expense.
    await Transaction.insertMany([
      { clerkId: alice, type: 'expense', amountPaise: 1000, category: 'food', date: currentMonthIso(6) },
    ]);

    await bearer(tokenFor(alice))
      .post('/api/v1/coach/query')
      .send({ question: 'Am I overspending?' });

    const instruction = lastGeminiCall()?.config.systemInstruction ?? '';
    expect(instruction).toContain('food');
    expect(instruction).toContain('1000');
    expect(instruction).not.toContain('housing');
    expect(instruction).not.toContain('50000000');
  });

  it('falls back gracefully to raw text when Gemini returns malformed output', async () => {
    geminiState.nextText = 'Sorry, I cannot answer that plainly.';
    const token = tokenFor('user_2fallback');

    const res = await bearer(token)
      .post('/api/v1/coach/query')
      .send({ question: 'What should I do?' });

    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('Sorry, I cannot answer that plainly.');
    expect(res.body.suggestedQuestions).toEqual([]);
  });

  it('handles an empty account (insufficient data) without inventing numbers', async () => {
    const token = tokenFor('user_2empty');

    const res = await bearer(token)
      .post('/api/v1/coach/query')
      .send({ question: 'Where am I spending too much money?' });

    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('Focus on food spending');
    expect(res.body.sourcesUsed).toEqual([]);

    const instruction = lastGeminiCall()?.config.systemInstruction ?? '';
    expect(instruction).toContain('"hasTransactions":false');
    expect(instruction).toContain('"transactionCount":0');
  });
});

describe('coach — rate limiting', () => {
  it('returns 429 once the per-IP allowance is exceeded (practical check)', async () => {
    const mini = express();
    mini.use(
      createRateLimiter({ windowMs: 60_000, limit: 2 }),
      (_req: express.Request, res: express.Response) => {
        res.json({ ok: true });
      }
    );

    const first = await request(mini).get('/');
    const second = await request(mini).get('/');
    const third = await request(mini).get('/');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });
});