import type { Paise } from './money';

/** Mirrors GET /api/v1/analytics/summary. Money is integer paise. */
export interface AnalyticsSummary {
  summary: SummaryMetrics;
  comparison: PeriodComparison;
  /** Expense breakdown, sorted by amount desc. */
  categories: CategoryBreakdown[];
  /** Income breakdown, sorted by amount desc. */
  incomeCategories: CategoryBreakdown[];
  monthlyTrend: MonthlyTrendPoint[];
  largestExpense: LargestExpense | null;
  /** The exact window the numbers were computed over. */
  period: AnalyticsPeriod;
}

export interface SummaryMetrics {
  balancePaise: Paise;
  incomePaise: Paise;
  expensePaise: Paise;
  savingsPaise: Paise;
  /** savings / income × 100. 0 when income is zero. */
  savingsRate: number;
  transactionCount: number;
}

export interface PeriodComparison {
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
  savingsChangePercent: number | null;
}

export interface CategoryBreakdown {
  category: string;
  amountPaise: Paise;
  /** Share of total for the matching type (%). */
  percentage: number;
}

export interface MonthlyTrendPoint {
  /** UTC month key, e.g. "2026-07". */
  month: string;
  incomePaise: Paise;
  expensePaise: Paise;
  savingsPaise: Paise;
}

export interface LargestExpense {
  id: string;
  amountPaise: Paise;
  category: string;
  description: string;
  date: string;
}

export interface AnalyticsPeriod {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
}