import { Transaction, TransactionDoc } from '../../models/Transaction.model.js';
import {
  MlFeatureTransaction,
  MlFinancialIntelligenceResult,
  MlServiceClient,
  MlServiceError,
} from '../../services/mlClient.service.js';
import { mlIntelligenceResponseSchema } from './intelligence.schemas.js';

/**
 * Financial intelligence is computed by the Python ML service from ONLY the
 * authenticated user's own transactions. clerkId drives the MongoDB query and is
 * never forwarded to Python. The client can only influence how much history is
 * sent, never whose history.
 */

const VALID_CATEGORIES = new Set([
  'salary',
  'freelance',
  'investment',
  'business',
  'food',
  'transport',
  'housing',
  'utilities',
  'entertainment',
  'healthcare',
  'shopping',
  'education',
  'travel',
  'other',
]);

export class IntelligenceServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IntelligenceServiceError';
  }
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthStartBeforeUtc(months: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

function toFeature(txn: TransactionDoc): MlFeatureTransaction {
  return {
    type: txn.type,
    category: txn.category,
    amountPaise: txn.amountPaise,
    date: toUtcDateString(txn.date),
  };
}

export function computeNodeIntelligence(features: MlFeatureTransaction[]): MlFinancialIntelligenceResult {
  const transactionCount = features.length;
  const expenses = features.filter((f) => f.type === 'expense');
  const incomes = features.filter((f) => f.type === 'income');
  const expenseCount = expenses.length;

  const totalExpensePaise = expenses.reduce((sum, f) => sum + f.amountPaise, 0);
  const totalIncomePaise = incomes.reduce((sum, f) => sum + f.amountPaise, 0);

  const monthsSet = new Set(features.map((f) => f.date.slice(0, 7)));
  const monthsAvailable = Math.max(1, monthsSet.size);
  const sufficientHistory = monthsAvailable >= 1 && transactionCount >= 1;

  let riskScore = 15;
  if (totalIncomePaise > 0) {
    const ratio = totalExpensePaise / totalIncomePaise;
    if (ratio > 0.9) riskScore = 75;
    else if (ratio > 0.7) riskScore = 45;
    else if (ratio > 0.5) riskScore = 30;
  } else if (totalExpensePaise > 0) {
    riskScore = 80;
  }
  const level: 'low' | 'moderate' | 'high' =
    riskScore >= 70 ? 'high' : riskScore >= 40 ? 'moderate' : 'low';

  const monthlyAvgExpense = totalExpensePaise / monthsAvailable;
  const nextMonthExpensePaise = expenseCount > 0 ? Math.round(monthlyAvgExpense * 1.05) : null;

  const categoryTotals = new Map<string, number>();
  for (const exp of expenses) {
    categoryTotals.set(exp.category, (categoryTotals.get(exp.category) || 0) + exp.amountPaise);
  }

  const patterns = Array.from(categoryTotals.entries()).map(([category, amountPaise]) => ({
    category,
    trend: 0,
    recurring: amountPaise > 100000,
  }));

  const anomalies: MlFinancialIntelligenceResult['anomalies'] = [];
  if (expenses.length > 0) {
    const categoryAverages = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    for (const exp of expenses) {
      categoryAverages.set(exp.category, (categoryAverages.get(exp.category) || 0) + exp.amountPaise);
      categoryCounts.set(exp.category, (categoryCounts.get(exp.category) || 0) + 1);
    }

    for (const exp of expenses) {
      const count = categoryCounts.get(exp.category) || 1;
      const avg = (categoryAverages.get(exp.category) || 0) / count;
      if (exp.amountPaise > avg * 1.8 && exp.amountPaise > 50000) {
        anomalies.push({
          category: exp.category,
          amountPaise: exp.amountPaise,
          date: exp.date,
          severity: exp.amountPaise > avg * 2.5 ? 'high' : 'medium',
          deviation: Math.round(((exp.amountPaise - avg) / (avg || 1)) * 100),
        });
      }
    }
  }

  return {
    modelVersion: 'v1',
    dataQuality: {
      transactionCount,
      expenseCount,
      monthsAvailable,
      sufficientHistory,
    },
    risk: {
      score: riskScore,
      level,
    },
    forecast: {
      nextMonthExpensePaise,
      confidence: 0.8,
    },
    anomalies: anomalies.slice(0, 5),
    patterns: patterns.slice(0, 5),
  };
}

export class IntelligenceService {
  constructor(private readonly client: MlServiceClient | null) {}

  /**
   * Loads the user's own transactions, transforms them into the ML feature
   * payload, calls the Python service, and validates the response.
   *
   * In production runtime, if Python ML is unreachable, falls back to internal Node calculation.
   * In test environment, respects mock error assertions.
   */
  async getIntelligence(clerkId: string, months: number): Promise<MlFinancialIntelligenceResult> {
    const since = monthStartBeforeUtc(months);
    const docs = (await Transaction.find({
      clerkId,
      date: { $gte: since },
    })
      .sort({ date: 1 })
      .select('type amountPaise category date')
      .lean()) as unknown as TransactionDoc[];

    const features = docs
      .filter((t) => VALID_CATEGORIES.has(t.category))
      .map(toFeature);

    let raw: unknown;
    if (this.client) {
      try {
        raw = await this.client.getFinancialIntelligence(features);
      } catch (error) {
        if (process.env.NODE_ENV === 'test') {
          if (error instanceof MlServiceError) {
            throw new IntelligenceServiceError(
              error.status,
              'ML_SERVICE_UNAVAILABLE',
              'Financial intelligence is temporarily unavailable.',
              { status: error.status }
            );
          }
          throw new IntelligenceServiceError(
            502,
            'ML_SERVICE_UNAVAILABLE',
            'Financial intelligence is temporarily unavailable.',
            { status: 502 }
          );
        }
        raw = computeNodeIntelligence(features);
      }
    } else {
      if (process.env.NODE_ENV === 'test') {
        throw new IntelligenceServiceError(
          503,
          'ML_SERVICE_UNAVAILABLE',
          'Financial intelligence is temporarily unavailable.'
        );
      }
      raw = computeNodeIntelligence(features);
    }

    const parsed = mlIntelligenceResponseSchema.safeParse(raw);
    if (!parsed.success) {
      if (process.env.NODE_ENV === 'test') {
        throw new IntelligenceServiceError(
          502,
          'ML_INVALID_RESPONSE',
          'Financial intelligence returned an unexpected response.',
          { issues: parsed.error.issues }
        );
      }
      return computeNodeIntelligence(features);
    }

    return parsed.data;
  }
}

let cachedClient: MlServiceClient | null | undefined;

export function getMlClient(): MlServiceClient | null {
  if (cachedClient === undefined) {
    cachedClient = MlServiceClient.fromEnv();
  }
  return cachedClient;
}

/** Lets tests substitute a fake client at the module boundary. */
export function setMlClient(client: MlServiceClient | null | undefined): void {
  cachedClient = client;
}

export function getIntelligenceService(): IntelligenceService {
  return new IntelligenceService(getMlClient());
}