import type { Paise } from './money';

/** Mirrors GET /api/v1/intelligence. All amounts are integer paise. */
export interface FinancialIntelligence {
  modelVersion: string;
  dataQuality: IntelligenceDataQuality;
  risk: IntelligenceRisk;
  forecast: IntelligenceForecast;
  anomalies: IntelligenceAnomaly[];
  patterns: IntelligencePattern[];
}

export interface IntelligenceDataQuality {
  transactionCount: number;
  expenseCount: number;
  monthsAvailable: number;
  /** False when there isn't enough history for the headline numbers to be meaningful. */
  sufficientHistory: boolean;
}

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface IntelligenceRisk {
  /** ML/statistical indicator, 0-100. Not a credit score. */
  score: number;
  level: RiskLevel;
}

export interface IntelligenceForecast {
  /** Estimated next-month expense in paise, or null when history is insufficient. */
  nextMonthExpensePaise: Paise | null;
  /** Model confidence, 0-1. */
  confidence: number;
}

export type Severity = 'low' | 'medium' | 'high';

export interface IntelligenceAnomaly {
  category: string;
  amountPaise: Paise;
  date: string;
  severity: Severity;
  /** How far the amount deviates from this category's typical spending, >= 0. */
  deviation: number;
}

export interface IntelligencePattern {
  category: string;
  /** Normalized monthly slope: positive = rising, negative = falling. */
  trend: number;
  /** True when the category appears in most available months. */
  recurring: boolean;
}

export interface IntelligenceParams {
  /** How many trailing calendar months of history to analyze. */
  months?: number;
}