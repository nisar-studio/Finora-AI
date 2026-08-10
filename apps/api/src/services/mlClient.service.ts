import { env } from '../config/env.js';

/** Internal ML endpoint that Node (not the browser) calls. */
export const ML_ENDPOINT = {
  financialIntelligence: '/api/v1/financial-intelligence',
} as const;

export class MlServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'MlServiceError';
  }
}

export class MlServiceUnavailableError extends MlServiceError {
  constructor(message: string, cause?: unknown) {
    super(503, message, cause);
    this.name = 'MlServiceUnavailableError';
  }
}

export class MlServiceTimeoutError extends MlServiceError {
  constructor(message: string) {
    super(504, message);
    this.name = 'MlServiceTimeoutError';
  }
}

export class MlServiceInvalidResponseError extends MlServiceError {
  constructor(message: string, cause?: unknown) {
    super(502, message, cause);
    this.name = 'MlServiceInvalidResponseError';
  }
}

export interface MlFinancialIntelligenceResult {
  modelVersion: string;
  dataQuality: {
    transactionCount: number;
    expenseCount: number;
    monthsAvailable: number;
    sufficientHistory: boolean;
  };
  risk: {
    score: number;
    level: 'low' | 'moderate' | 'high';
  };
  forecast: {
    nextMonthExpensePaise: number | null;
    confidence: number;
  };
  anomalies: Array<{
    category: string;
    amountPaise: number;
    date: string;
    severity: 'low' | 'medium' | 'high';
    deviation: number;
  }>;
  patterns: Array<{
    category: string;
    trend: number;
    recurring: boolean;
  }>;
}

export interface MlFeatureTransaction {
  type: 'income' | 'expense';
  category: string;
  amountPaise: number;
  /** Calendar date, YYYY-MM-DD. */
  date: string;
}

export class MlServiceClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  /** Outbound timeout in ms. Keeps a slow/dead ML service from hanging a request. */
  private readonly timeoutMs: number;

  constructor(config: { baseUrl: string; apiKey: string; timeoutMs?: number }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  public static fromEnv(): MlServiceClient | null {
    const config = env();
    if (!config.ML_SERVICE_URL || !config.ML_SERVICE_API_KEY) {
      return null;
    }
    return new MlServiceClient({
      baseUrl: config.ML_SERVICE_URL,
      apiKey: config.ML_SERVICE_API_KEY,
    });
  }

  /**
   * Runs the unified financial-intelligence computation over the given history
   * and returns the validated result. Throws MlServiceError subclasses on any
   * transport/validation failure so callers can degrade gracefully.
   *
   * The payload contains only numeric/categorical financial features - never a
   * Clerk token, clerkId, email, or name.
   */
  public async getFinancialIntelligence(
    history: MlFeatureTransaction[]
  ): Promise<MlFinancialIntelligenceResult> {
    const body = JSON.stringify({ history });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${ML_ENDPOINT.financialIntelligence}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ml-api-key': this.apiKey,
        },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new MlServiceTimeoutError('ML service timed out.');
      }
      throw new MlServiceUnavailableError('ML service unreachable.', error);
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 503) {
      throw new MlServiceUnavailableError(`ML service unavailable (${response.status}).`);
    }
    if (!response.ok) {
      throw new MlServiceError(response.status, `ML service error ${response.status}.`);
    }

    try {
      return (await response.json()) as MlFinancialIntelligenceResult;
    } catch (error) {
      throw new MlServiceInvalidResponseError('ML service returned malformed JSON.', error);
    }
  }
}