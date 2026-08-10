import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useDeleteGoal } from '../../lib/useGoals';
import { formatINR } from '../../types/money';
import { formatDeadline, goalStatusLabel } from '../../types/goal';
import type { Goal, GoalStatus } from '../../types/goal';
import { GoalForm } from './GoalForm';

const statusBadge: Record<GoalStatus, string> = {
  completed: 'border-brand/40 bg-brand/10 text-brand',
  on_track: 'border-ink/15 bg-ink/5 text-ink-muted',
  behind: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
  overdue: 'border-red-400/40 bg-red-400/10 text-red-400',
};

const statLabel = 'text-xs text-ink-muted';
const statValue = 'text-base font-semibold text-ink';
const iconButton =
  'rounded-md p-1.5 text-ink-muted transition-colors hover:text-ink';

export function GoalCard({ goal }: { goal: Goal }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteGoal();

  if (editing) {
    return (
      <div className="rounded-lg border border-ink/10 bg-surface p-4">
        <GoalForm
          mode="edit"
          goal={goal}
          onCancel={() => {
            setEditing(false);
            setConfirming(false);
          }}
        />
      </div>
    );
  }

  const { progress } = goal;
  const width = `${Math.min(100, Math.max(0, progress.progressPercentage))}%`;

  return (
    <article
      className={`flex flex-col rounded-lg border bg-surface p-5 ${
        progress.status === 'completed' ? 'border-brand/30' : 'border-ink/10'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-ink">{goal.name}</h2>
          <span
            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge[progress.status]}`}
          >
            {goalStatusLabel(progress.status)}
          </span>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label={`Edit ${goal.name}`}
            className={iconButton}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${goal.name}`}
            className={`${iconButton} hover:text-red-400`}
            onClick={() => setConfirming((value) => !value)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {confirming ? (
        <div className="mt-3 rounded-md border border-red-400/30 bg-red-400/5 p-3">
          <p className="text-sm text-ink">Delete this goal?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(goal.id)}
              className="rounded-md bg-red-400 px-3 py-1.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-ink/10 px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
          {remove.isError ? (
            <p className="mt-2 text-sm text-red-400">{remove.error.message}</p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-sm text-ink-muted">
        {formatINR(goal.currentAmountPaise)} saved of{' '}
        <span className="text-ink">{formatINR(goal.targetAmountPaise)}</span>
      </p>

      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-brand" style={{ width }} />
        </div>
        <span className="shrink-0 text-sm font-medium text-ink">
          {progress.progressPercentage.toFixed(1)}%
        </span>
      </div>

      {goal.autosaveEnabled ? (
        <p className="mt-3 text-xs text-ink-muted">Auto-save is on</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/10 pt-4">
        <div>
          <p className={statLabel}>Remaining</p>
          <p className={statValue}>{formatINR(progress.remainingPaise)}</p>
        </div>
        <div>
          <p className={statLabel}>Needed per month</p>
          <p className={statValue}>
            {progress.requiredMonthlySavingsPaise === null
              ? '—'
              : `${formatINR(progress.requiredMonthlySavingsPaise)}/mo`}
          </p>
        </div>
        <div>
          <p className={statLabel}>Deadline</p>
          <p className={statValue}>{formatDeadline(goal.deadline)}</p>
        </div>
        <div>
          <p className={statLabel}>Days left</p>
          <p className={statValue}>
            {progress.daysRemaining === null ? '—' : `${progress.daysRemaining}d`}
          </p>
        </div>
      </div>
    </article>
  );
}