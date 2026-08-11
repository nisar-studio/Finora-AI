import { Link } from 'react-router-dom';
import { BrainCircuit, Inbox } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useIntelligence } from '../lib/useIntelligence';
import { FinancialIntelligence } from '../types/intelligence';
import { DataQualityNotice } from '../components/intelligence/DataQualityNotice';
import { ExpenseForecastCard } from '../components/intelligence/ExpenseForecastCard';
import { FinancialRiskCard } from '../components/intelligence/FinancialRiskCard';
import { SpendingAnomalies } from '../components/intelligence/SpendingAnomalies';
import { SpendingPatterns } from '../components/intelligence/SpendingPatterns';

const ML_UNAVAILABLE_MESSAGE =
  'Financial intelligence is temporarily unavailable. Your transactions and dashboard are still working normally.';

export function IntelligencePage() {
  const query = useIntelligence();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Financial Intelligence</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Statistical insights computed from your own transactions by the machine-learning service —
          every number comes from the backend.
        </p>
      </header>

      {query.isLoading ? (
        <IntelligenceSkeleton />
      ) : query.isError ? (
        <IntelligenceError error={query.error} onRetry={query.refetch} />
      ) : query.data ? (
        query.data.dataQuality.transactionCount === 0 ? (
          <IntelligenceEmpty />
        ) : (
          <IntelligenceContent data={query.data} />
        )
      ) : null}
    </section>
  );
}

function IntelligenceContent({ data }: { data: FinancialIntelligence }) {
  return (
    <div className="space-y-6">
      <DataQualityNotice dataQuality={data.dataQuality} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FinancialRiskCard risk={data.risk} />
        <ExpenseForecastCard forecast={data.forecast} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SpendingAnomalies anomalies={data.anomalies} />
        <SpendingPatterns patterns={data.patterns} />
      </div>
    </div>
  );
}

function IntelligenceError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const isMlUnavailable =
    error instanceof ApiError && (error.code === 'ML_SERVICE_UNAVAILABLE' || error.code === 'ML_INVALID_RESPONSE');
  const message =
    error instanceof ApiError && isMlUnavailable
      ? ML_UNAVAILABLE_MESSAGE
      : error instanceof Error
        ? error.message
        : 'Couldn’t load financial intelligence.';

  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-12 text-center">
      <BrainCircuit className="mx-auto size-8 text-ink-muted" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-ink">
        {isMlUnavailable ? 'Insights are temporarily unavailable' : 'Couldn’t load financial intelligence'}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 cursor-pointer"
        >
          Try again
        </button>
        <Link
          to="/app/dashboard"
          className="rounded-md border border-ink/15 bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function IntelligenceEmpty() {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-12 text-center">
      <Inbox className="mx-auto size-8 text-ink-muted" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-ink">No transactions yet</p>
      <p className="mt-1 text-sm text-ink-muted">
        Add your first income or expense and intelligence will be computed live from your data.
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

function IntelligenceSkeleton() {
  const card = 'animate-pulse rounded-lg border border-ink/10 bg-surface';
  return (
    <div className="space-y-6">
      <div className={`${card} h-20 p-4`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${card} h-52 p-4`} />
        <div className={`${card} h-52 p-4`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${card} h-64 p-4`} />
        <div className={`${card} h-64 p-4`} />
      </div>
    </div>
  );
}