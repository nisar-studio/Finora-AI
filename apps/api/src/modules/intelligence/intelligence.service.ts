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

export class IntelligenceService {
  constructor(private readonly client: MlServiceClient | null) {}

  /**
   * Loads the user's own transactions, transforms them into the ML feature
   * payload, calls the Python service, and validates the response.
   *
   * Failures are surfaced as typed errors so the controller can degrade
   * gracefully instead of crashing the API.
   */
  async getIntelligence(clerkId: string, months: number): Promise<MlFinancialIntelligenceResult> {
    if (!this.client) {
      throw new IntelligenceServiceError(
        503,
        'ML_SERVICE_UNAVAILABLE',
        'Financial intelligence is temporarily unavailable.'
      );
    }

    const since = monthStartBeforeUtc(months);
    // Scoped by clerkId at the query level; the user can never affect each other.
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
    try {
      raw = await this.client.getFinancialIntelligence(features);
    } catch (error) {
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

    const parsed = mlIntelligenceResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new IntelligenceServiceError(
        502,
        'ML_INVALID_RESPONSE',
        'Financial intelligence returned an unexpected response.',
        { issues: parsed.error.issues }
      );
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