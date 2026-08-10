import { Inbox } from 'lucide-react';
import { useGoals } from '../lib/useGoals';
import { GoalForm } from '../components/goals/GoalForm';
import { GoalCard } from '../components/goals/GoalCard';

export function GoalsPage() {
  const query = useGoals();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Savings Goals</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Set a target and a deadline; progress, status and monthly pace are calculated by the
          backend.
        </p>
      </header>

      <GoalForm />

      {query.isLoading ? (
        <GoalsSkeleton />
      ) : query.isError ? (
        <GoalsError message={query.error.message} onRetry={query.refetch} />
      ) : query.data ? (
        query.data.length === 0 ? (
          <GoalsEmpty />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

function GoalsEmpty() {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-12 text-center">
      <Inbox className="mx-auto size-8 text-ink-muted" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-ink">No goals yet</p>
      <p className="mt-1 text-sm text-ink-muted">
        Create your first savings goal above and watch your progress take shape.
      </p>
    </div>
  );
}

function GoalsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-12 text-center">
      <p className="text-sm font-medium text-red-400">Couldn’t load your goals</p>
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

function GoalsSkeleton() {
  const card = 'h-56 animate-pulse rounded-lg border border-ink/10 bg-surface';
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className={card} />
      <div className={card} />
      <div className={card} />
    </div>
  );
}