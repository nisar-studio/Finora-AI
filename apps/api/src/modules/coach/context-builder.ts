import { Transaction } from '../../models/Transaction.model.js';
import { Goal, GoalDoc } from '../goals/goals.model.js';
import { calculateGoalMath, GoalStatus } from '../goals/goalMath.js';
import { AnalyticsSummaryResponse, getAnalyticsSummary } from '../analytics/analytics.service.js';
import { TrendEntry } from '../analytics/metrics.js';

/**
 * Builds a deterministic FinancialContext for the authenticated user (clerkId).
 *
 * - The owner always comes from the session via `clerkId`; it is never taken
 *   from the client.
 * - Only backend data sources are used: the analytics summary (current month),
 *   category trends, and active savings goals.
 * - Current month is derived from `now` (defaults to real clock so the endpoint
 *   uses "this month"; tests inject a fixed `now` for determinism).
 * - The previous comparison period is the immediately preceding calendar month
 *   (same length), because the current window is bounded to the calendar month.
 * - All amounts are integer paise. Raw transaction descriptions are excluded:
 *   they are only surfaced when explicitly required elsewhere.
 */

export interface CoachCategory {
  category: string;
  amountPaise: number;
  percentage: number;
}

export interface CoachCategoryTrendPoint {
  month: string;
  amountPaise: number;
}

export interface CoachCategoryTrend {
  category: string;
  months: CoachCategoryTrendPoint[];
}

export interface CoachGoalBrief {
  name: string;
  status: GoalStatus;
  progressPercentage: number;
  targetAmountPaise: number;
  currentAmountPaise: number;
  remainingPaise: number;
  requiredMonthlySavingsPaise: number | null;
  deadline: string | null;
}

export interface CoachGoalsSummary {
  total: number;
  byStatus: Record<GoalStatus, number>;
  combinedProgressPercentage: number;
  goals: CoachGoalBrief[];
}

export interface FinancialContext {
  generatedAtIso: string;
  period: { fromIso: string; toIso: string; label: string };
  summary: {
    incomePaise: number;
    expensePaise: number;
    savingsPaise: number;
    savingsRate: number;
    balancePaise: number;
    transactionCount: number;
  };
  comparison: {
    incomeChangePercent: number | null;
    expenseChangePercent: number | null;
    savingsChangePercent: number | null;
  };
  topSpendingCategories: CoachCategory[];
  incomeCategories: CoachCategory[];
  categoryTrends: CoachCategoryTrend[];
  largestExpense: { amountPaise: number; category: string; dateIso: string } | null;
  monthlyTrend: TrendEntry[];
  goals: CoachGoalsSummary;
  dataQuality: { hasTransactions: boolean; hasGoals: boolean; monthsOfHistory: number };
}

const TREND_MONTHS = 6;
const CATEGORY_TREND_LIMIT = 3;

const round2 = (value: number): number => Math.round(value * 100) / 100;

function monthStartUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthEndUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) - 1);
}

function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function emptyGoalsSummary(): CoachGoalsSummary {
  return {
    total: 0,
    byStatus: { on_track: 0, behind: 0, completed: 0, overdue: 0 },
    combinedProgressPercentage: 0,
    goals: [],
  };
}

function buildGoals(goalDocs: GoalDoc[], now: Date): CoachGoalsSummary {
  const byStatus: Record<GoalStatus, number> = { on_track: 0, behind: 0, completed: 0, overdue: 0 };
  let totalTargetPaise = 0;
  let totalCurrentPaise = 0;

  const goals = goalDocs.map((goal) => {
    const math = calculateGoalMath(
      {
        targetAmountPaise: goal.targetAmountPaise,
        currentAmountPaise: goal.currentAmountPaise,
        deadline: goal.deadline ?? null,
        createdAt: goal.createdAt,
      },
      now
    );

    byStatus[math.status] += 1;
    totalTargetPaise += goal.targetAmountPaise;
    totalCurrentPaise += goal.currentAmountPaise;

    return {
      name: goal.name,
      status: math.status,
      progressPercentage: math.progressPercentage,
      targetAmountPaise: goal.targetAmountPaise,
      currentAmountPaise: goal.currentAmountPaise,
      remainingPaise: math.remainingPaise,
      requiredMonthlySavingsPaise: math.requiredMonthlySavingsPaise,
      deadline: goal.deadline ? goal.deadline.toISOString() : null,
    };
  });

  return {
    total: goals.length,
    byStatus,
    combinedProgressPercentage: totalTargetPaise === 0 ? 0 : round2((totalCurrentPaise / totalTargetPaise) * 100),
    goals,
  };
}

export async function buildFinancialContext(
  clerkId: string,
  now: Date = new Date()
): Promise<FinancialContext> {
  const from = monthStartUtc(now);
  const to = monthEndUtc(now);

  const analytics: AnalyticsSummaryResponse = await getAnalyticsSummary(clerkId, {
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const goalDocs = (await Goal.find({ clerkId }).lean()) as unknown as GoalDoc[];

  const trendStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (TREND_MONTHS - 1), 1)
  );

  const trendRows = await Transaction.find({
    clerkId,
    date: { $gte: trendStart, $lte: to },
  })
    .select('type amountPaise category date')
    .lean();

  const categoryMonthTotals = new Map<string, Map<string, number>>();
  for (const row of trendRows) {
    if (row.type !== 'expense') {
      continue;
    }
    const month = toMonthKey(row.date);
    const monthTotals = categoryMonthTotals.get(row.category) ?? new Map<string, number>();
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + row.amountPaise);
    categoryMonthTotals.set(row.category, monthTotals);
  }

  const monthKeys: string[] = [];
  const cursor = new Date(trendStart);
  for (let i = 0; i < TREND_MONTHS; i += 1) {
    monthKeys.push(toMonthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const categoryTrends: CoachCategoryTrend[] = analytics.categories
    .slice(0, CATEGORY_TREND_LIMIT)
    .map((entry) => ({
      category: entry.category,
      months: monthKeys.map((month) => ({
        month,
        amountPaise: categoryMonthTotals.get(entry.category)?.get(month) ?? 0,
      })),
    }));

  const monthsOfHistory = analytics.monthlyTrend.filter(
    (entry) => entry.incomePaise > 0 || entry.expensePaise > 0
  ).length;

  const analyticsSummary = analytics.summary;

  return {
    generatedAtIso: now.toISOString(),
    period: {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      label: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    },
    summary: {
      incomePaise: analyticsSummary.incomePaise,
      expensePaise: analyticsSummary.expensePaise,
      savingsPaise: analyticsSummary.savingsPaise,
      savingsRate: analyticsSummary.savingsRate,
      balancePaise: analyticsSummary.balancePaise,
      transactionCount: analyticsSummary.transactionCount,
    },
    comparison: {
      incomeChangePercent: analytics.comparison.incomeChangePercent,
      expenseChangePercent: analytics.comparison.expenseChangePercent,
      savingsChangePercent: analytics.comparison.savingsChangePercent,
    },
    topSpendingCategories: analytics.categories,
    incomeCategories: analytics.incomeCategories,
    categoryTrends,
    largestExpense: analytics.largestExpense
      ? {
          amountPaise: analytics.largestExpense.amountPaise,
          category: analytics.largestExpense.category,
          dateIso: analytics.largestExpense.date.toISOString(),
        }
      : null,
    monthlyTrend: analytics.monthlyTrend,
    goals: buildGoals(goalDocs, now),
    dataQuality: {
      hasTransactions: analytics.summary.transactionCount > 0,
      hasGoals: goalDocs.length > 0,
      monthsOfHistory,
    },
  };
}