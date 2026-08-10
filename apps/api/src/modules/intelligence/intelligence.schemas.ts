import { z } from 'zod';

/**
 * Validates the Python ML service response at the hard boundary. A malformed ML
 * response is rejected here so it can never propagate untyped data into the
 * API response. Field-for-field mirror of app/schemas/intelligence.py.
 */
export const mlIntelligenceResponseSchema = z.object({
  modelVersion: z.string().min(1),
  dataQuality: z.object({
    transactionCount: z.number().int().nonnegative(),
    expenseCount: z.number().int().nonnegative(),
    monthsAvailable: z.number().int().nonnegative(),
    sufficientHistory: z.boolean(),
  }),
  risk: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(['low', 'moderate', 'high']),
  }),
  forecast: z.object({
    nextMonthExpensePaise: z.number().int().nonnegative().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  anomalies: z.array(
    z.object({
      category: z.string().min(1),
      amountPaise: z.number().int().positive(),
      date: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      deviation: z.number().nonnegative(),
    })
  ),
  patterns: z.array(
    z.object({
      category: z.string().min(1),
      trend: z.number().min(-1).max(1),
      recurring: z.boolean(),
    })
  ),
});

export type MlIntelligenceResponse = z.infer<typeof mlIntelligenceResponseSchema>;

export const intelligenceQuerySchema = z.object({
  query: z.object({
    /** How many trailing calendar months of history to forward to the ML service. */
    months: z.coerce.number().int().min(1).max(36).default(24),
  }),
});

export type IntelligenceQuery = z.infer<typeof intelligenceQuerySchema>['query'];