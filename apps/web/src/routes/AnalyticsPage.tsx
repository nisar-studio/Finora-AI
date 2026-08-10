import { useAnalytics } from '../lib/useAnalytics';
import { MonthlyIncomeExpenseChart } from '../components/dashboard/MonthlyIncomeExpenseChart';
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart';
import { TopCategories } from '../components/dashboard/TopCategories';
import { ComparisonList } from '../components/dashboard/ComparisonList';
import { MetricCard } from '../components/dashboard/MetricCard';
import { formatINR, formatPercent } from '../types/money';

export function AnalyticsPage() {
  const query = useAnalytics();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Financial Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Deep-dive spending breakdowns, category distributions, and historical trends computed from your real data.
        </p>
      </header>

      {query.isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-24 animate-pulse rounded-lg border border-ink/10 bg-surface" />
            <div className="h-24 animate-pulse rounded-lg border border-ink/10 bg-surface" />
            <div className="h-24 animate-pulse rounded-lg border border-ink/10 bg-surface" />
            <div className="h-24 animate-pulse rounded-lg border border-ink/10 bg-surface" />
          </div>
          <div className="h-64 animate-pulse rounded-lg border border-ink/10 bg-surface" />
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-ink/10 bg-surface p-8 text-center">
          <p className="text-sm font-medium text-red-400">Couldn’t load analytics</p>
          <p className="mt-1 text-sm text-ink-muted">{query.error.message}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-inverse"
          >
            Retry
          </button>
        </div>
      ) : query.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Income" value={formatINR(query.data.summary.incomePaise)} />
            <MetricCard label="Total Expenses" value={formatINR(query.data.summary.expensePaise)} />
            <MetricCard label="Net Balance" value={formatINR(query.data.summary.balancePaise)} />
            <MetricCard label="Savings Rate" value={formatPercent(query.data.summary.savingsRate)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col rounded-lg border border-ink/10 bg-surface p-4 lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-ink">Income vs Expense Trend</h2>
              <MonthlyIncomeExpenseChart data={query.data.monthlyTrend} />
            </div>

            <div className="flex flex-col rounded-lg border border-ink/10 bg-surface p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">Period Comparison</h2>
              <ComparisonList comparison={query.data.comparison} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col rounded-lg border border-ink/10 bg-surface p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">Category Distribution</h2>
              <CategoryDonutChart data={query.data.categories} />
            </div>

            <div className="flex flex-col rounded-lg border border-ink/10 bg-surface p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">Top Spending Breakdown</h2>
              <TopCategories categories={query.data.categories} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}