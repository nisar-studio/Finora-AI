import { buildPublishableKey } from '@clerk/shared/keys';
import { CLERK_JWT_KEY_PEM } from './test-keys.js';

/**
 * Test environment. Runs before every test file. Must be set before `env()`
 * is first called (env values are cached per process).
 *
 * `CLERK_JWT_KEY` is the public PEM for the test signing keypair, enabling
 * networkless verification of the RS256 tokens signed in the tests.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3999';
process.env.CLERK_SECRET_KEY =
  process.env.CLERK_SECRET_KEY ?? 'sk_test_000000000000000000000000000000000000000000';
process.env.CLERK_PUBLISHABLE_KEY =
  process.env.CLERK_PUBLISHABLE_KEY ?? buildPublishableKey('finora-api.test');
process.env.CLERK_JWT_KEY = process.env.CLERK_JWT_KEY ?? CLERK_JWT_KEY_PEM;
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/finora_test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-gemini-key';
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';