import { FormEvent, useState } from 'react';
import { useCreateGoal, useUpdateGoal } from '../../lib/useGoals';
import { rupeesToPaise } from '../../types/money';
import type { Goal } from '../../types/goal';

const inputClass =
  'w-full rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none';

interface GoalFormProps {
  mode?: 'create' | 'edit';
  goal?: Goal;
  onCancel?: () => void;
}

/** Converts a <input type="date"> value (YYYY-MM-DD) to an ISO date-time. */
function dateToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

/** Paise -> decimal string for a number input, avoiding float noise. */
function paiseToRupeesString(paise: number): string {
  return String(paise / 100);
}

export function GoalForm({ mode = 'create', goal, onCancel }: GoalFormProps) {
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const isEdit = mode === 'edit';
  const mutation = isEdit ? update : create;

  const [name, setName] = useState(isEdit && goal ? goal.name : '');
  const [targetRupees, setTargetRupees] = useState(
    isEdit && goal ? paiseToRupeesString(goal.targetAmountPaise) : ''
  );
  const [savedRupees, setSavedRupees] = useState(
    isEdit && goal ? paiseToRupeesString(goal.currentAmountPaise) : ''
  );
  const [deadline, setDeadline] = useState(
    isEdit && goal ? (goal.deadline?.slice(0, 10) ?? '') : ''
  );
  const [autosave, setAutosave] = useState(isEdit && goal ? goal.autosaveEnabled : false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);

    const targetPaise = rupeesToPaise(Number(targetRupees));
    const savedPaise = savedRupees === '' ? 0 : rupeesToPaise(Number(savedRupees));

    if (!name.trim()) {
      setFieldError('Give this goal a name.');
      return;
    }
    if (!Number.isFinite(targetPaise) || targetPaise <= 0) {
      setFieldError('Target must be a positive amount.');
      return;
    }
    if (!Number.isFinite(savedPaise) || savedPaise < 0) {
      setFieldError('Saved so far cannot be negative.');
      return;
    }
    if (savedPaise > targetPaise) {
      setFieldError('Saved amount cannot exceed the target.');
      return;
    }

    const deadlineIso = deadline ? dateToIso(deadline) : undefined;

    if (isEdit && goal && onCancel) {
      update.mutate(
        {
          id: goal.id,
          input: {
            name: name.trim(),
            targetAmountPaise: targetPaise,
            currentAmountPaise: savedPaise,
            deadline: deadlineIso ?? null,
            autosaveEnabled: autosave,
          },
        },
        {
          onSuccess: () => onCancel(),
        }
      );
      return;
    }

    create.mutate(
      {
        name: name.trim(),
        targetAmountPaise: targetPaise,
        currentAmountPaise: savedPaise,
        deadline: deadlineIso,
        autosaveEnabled: autosave,
      },
      {
        onSuccess: () => {
          setName('');
          setTargetRupees('');
          setSavedRupees('');
          setDeadline('');
          setAutosave(false);
        },
      }
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-lg border border-ink/10 bg-surface p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="goal-name" className="mb-1 block text-xs font-medium text-ink-muted">
          Name
        </label>
        <input
          id="goal-name"
          type="text"
          maxLength={80}
          required
          placeholder="e.g. Emergency fund"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="goal-target" className="mb-1 block text-xs font-medium text-ink-muted">
          Target (₹)
        </label>
        <input
          id="goal-target"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="0.00"
          className={inputClass}
          value={targetRupees}
          onChange={(e) => setTargetRupees(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="goal-saved" className="mb-1 block text-xs font-medium text-ink-muted">
          Saved so far (₹)
        </label>
        <input
          id="goal-saved"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className={inputClass}
          value={savedRupees}
          onChange={(e) => setSavedRupees(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="goal-deadline" className="mb-1 block text-xs font-medium text-ink-muted">
          Deadline (optional)
        </label>
        <input
          id="goal-deadline"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          className={inputClass}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <div className="flex items-end pb-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={autosave}
            onChange={(e) => setAutosave(e.target.checked)}
            className="size-4 rounded border-ink/20 bg-surface accent-brand"
          />
          Auto-save
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending
            ? isEdit
              ? 'Saving…'
              : 'Adding…'
            : isEdit
              ? 'Save changes'
              : 'Add goal'}
        </button>

        {isEdit ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-ink/10 px-4 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        ) : null}

        {fieldError ? <p className="text-sm text-red-400">{fieldError}</p> : null}
        {mutation.isError ? <p className="text-sm text-red-400">{mutation.error.message}</p> : null}
      </div>
    </form>
  );
}