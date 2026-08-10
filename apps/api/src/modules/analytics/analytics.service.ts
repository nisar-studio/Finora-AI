import { Transaction, TransactionDoc } from '../../models/Transaction.model.js';
import {
  AnalyticsTx,
  buildMonthlyTrend,
  CategoryBreakdown,
  comparePeriods,
  computeMetrics,
  expenseCategoryTotals,
  incomeCategoryTotals,
  LargestExpense,
  largestExpense,
  SummaryMetrics,
  TrendEntry,
} from './metrics.js';
import { AnalyticsSummaryQuery } from './analytics.schemas.js';

const TREND_MONTHS = 6;

/**
 * Analytics are always computed from the authenticated user's own transactions
 * (clerkId). The client can only influence the date window, never the owner.
 */

export interface AnalyticsSummaryResponse {
  summary: SummaryMetrics;
  comparison: ReturnType<typeof comparePeriods>;
  categories: CategoryBreakdown[];
  incomeCategories: CategoryBreakdown[];
  monthlyTrend: TrendEntry[];
  largestExpense: LargestExpense | null;
  /** Exact window used, so clients can reason about the numbers. */
  period: {
    from: Date;
    to: Date;
    previousFrom: Date;
    previousTo: Date;
  };
}

interface ResolvedPeriod {
  summaryStart: Date;
  summaryEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  trendStart: Date;
}

function monthStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function resolvePeriod(query: AnalyticsSummaryQuery): ResolvedPeriod {
  const now = new Date();

  const summaryStart = query.from ? new Date(query.from) : monthStartUtc(now);
  const summaryEnd = query.to ? new Date(query.to) : new Date(summaryEndOfMonthUtc(now));

  // Previous period has the same length and sits immediately before `from`.
  const periodLengthMs = summaryEnd.getTime() - summaryStart.getTime();
  const previousEnd = new Date(summaryStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - periodLengthMs);

  const trendStart = addUtcMonths(monthStartUtc(summaryStart), -(TREND_MONTHS - 1));

  return { summaryStart, summaryEnd, previousStart, previousEnd, trendStart };
}

function summaryEndOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) - 1);
}

function toAnalyticsTx(doc: TransactionDoc): AnalyticsTx {
  return {
    id: doc._id.toString(),
    type: doc.type,
    amountPaise: doc.amountPaise,
    category: doc.category,
    date: doc.date,
    description: doc.description,
  };
}

export async function getAnalyticsSummary(
  clerkId: string,
  query: AnalyticsSummaryQuery
): Promise<AnalyticsSummaryResponse> {
  const period = resolvePeriod(query);

  const queryStart = new Date(Math.min(period.previousStart.getTime(), period.trendStart.getTime()));
  const docs = (await Transaction.find({
    clerkId,
    date: { $gte: queryStart, $lte: period.summaryEnd },
  })
    .select('type amountPaise category date description')
    .lean()) as unknown as TransactionDoc[];

  const transactions = docs.map(toAnalyticsTx);

  const inRange = (txn: AnalyticsTx, start: Date, end: Date): boolean =>
    txn.date.getTime() >= start.getTime() && txn.date.getTime() <= end.getTime();

  const summaryTransactions = transactions.filter((t) => inRange(t, period.summaryStart, period.summaryEnd));
  const previousTransactions = transactions.filter((t) => inRange(t, period.previousStart, period.previousEnd));
  const trendTransactions = transactions.filter((t) => inRange(t, period.trendStart, period.summaryEnd));

  const current = computeMetrics(summaryTransactions);
  const previous = computeMetrics(previousTransactions);

  return {
    summary: current,
    comparison: comparePeriods(current, previous),
    categories: expenseCategoryTotals(summaryTransactions),
    incomeCategories: incomeCategoryTotals(summaryTransactions),
    monthlyTrend: buildMonthlyTrend(trendTransactions, period.trendStart, period.summaryEnd),
    largestExpense: largestExpense(summaryTransactions),
    period: {
      from: period.summaryStart,
      to: period.summaryEnd,
      previousFrom: period.previousStart,
      previousTo: period.previousEnd,
    },
  };
}