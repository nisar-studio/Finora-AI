import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAnalytics } from '../lib/useAnalytics';
import { formatINR, formatPercent } from '../types/money';
import { categoryLabel } from '../types/transaction';
import { CategoryBreakdown, MonthlyTrendPoint } from '../types/analytics';
import { MetricCard } from '../components/dashboard/MetricCard';
import { MonthlyIncomeExpenseChart } from '../components/dashboard/MonthlyIncomeExpenseChart';
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart';
import { ComparisonList } from '../components/dashboard/ComparisonList';
import { TopCategories } from '../components/dashboard/TopCategories';

export function DashboardPage() {
  const query = useAnalytics();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Financial Overview</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Real numbers from your transactions, calculated in the Node backend.
        </p>
      </header>

      {query.isLoading ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <DashboardError message={query.error.message} onRetry={query.refetch} />
      ) : query.data ? (
        query.data.summary.transactionCount === 0 ? (
          <DashboardEmpty />
        ) : (
          <DashboardContent
            summary={query.data.summary}
            comparison={query.data.comparison}
            categories={query.data.categories}
            monthlyTrend={query.data.monthlyTrend}
            largestExpense={query.data.largestExpense}
          />
        )
      ) : null}
    </section>
  );
}

interface DashboardContentProps {
  summary: {
    balancePaise: number;
    incomePaise: number;
    expensePaise: number;
    savingsRate: number;
  };
  comparison: {
    incomeChangePercent: number | null;
    expenseChangePercent: number | null;
    savingsChangePercent: number | null;
  };
  categories: CategoryBreakdown[];
  monthlyTrend: MonthlyTrendPoint[];
  largestExpense: {
    amountPaise: number;
    category: string;
    description: string;
    date: string;
  } | null;
}

function DashboardContent({
  summary,
  comparison,
  categories,
  monthlyTrend,
  largestExpense,
}: DashboardContentProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Balance" value={formatINR(summary.balancePaise)} />
        <MetricCard label="Income" value={formatINR(summary.incomePaise)} />
        <MetricCard label="Expenses" value={formatINR(summary.expensePaise)} />
        <MetricCard label="Savings Rate" value={formatPercent(summary.savingsRate)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Income vs Expenses" className="lg:col-span-2">
          <MonthlyIncomeExpenseChart data={monthlyTrend} />
        </Panel>

        <Panel title="Current vs Last Month">
          <ComparisonList comparison={comparison} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Spending by Category">
          <CategoryDonutChart data={categories} />
        </Panel>

        <Panel title="Top Spending Categories">
          <TopCategories categories={categories} />
        </Panel>

        <Panel title="Largest Expense">
          {largestExpense ? (
            <div className="space-y-2">
              <p className="text-2xl font-semibold text-ink">{formatINR(largestExpense.amountPaise)}</p>
              <p className="text-sm capitalize text-ink">{categoryLabel(largestExpense.category)}</p>
              <p className="text-sm text-ink-muted">{largestExpense.description || 'No description'}</p>
              <p className="text-xs text-ink-muted">
                {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
                  new Date(largestExpense.date)
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No expenses in this period</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col rounded-lg border border-ink/10 bg-surface p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function DashboardEmpty() {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-12 text-center">
      <Inbox className="mx-auto size-8 text-ink-muted" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-ink">No transactions yet</p>
      <p className="mt-1 text-sm text-ink-muted">
        Add your first income or expense and this dashboard will be computed live from your data.
      </p>
      <Link
        to="/app/transactions"
        className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90"
      >
        Add a transaction
      </Link>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-12 text-center">
      <p className="text-sm font-medium text-red-400">Couldn’t load your dashboard</p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  const card = 'h-24 animate-pulse rounded-lg border border-ink/10 bg-surface';
  const panel = 'h-64 animate-pulse rounded-lg border border-ink/10 bg-surface';
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={card} />
        <div className={card} />
        <div className={card} />
        <div className={card} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${panel} lg:col-span-2`} />
        <div className={panel} />
      </div>
    </div>
  );
}