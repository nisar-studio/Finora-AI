import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
  // Optional PEM public key for Clerk's networkless JWT verification.
  // When set, session tokens are verified locally (no outbound JWKS request).
  CLERK_JWT_KEY: z.string().optional(),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.6-flash'),

  ML_SERVICE_URL: z.string().url().optional(),
  ML_SERVICE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    );
    console.error('[env] Invalid or missing environment variables:\n' + messages.join('\n'));
    throw new Error('Environment validation failed');
  }
  cached = result.data;
  return cached;
}

export function env(): Env {
  return loadEnv();
}