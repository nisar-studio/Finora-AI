/**
 * Pure, deterministic goal calculations. No DB access, no I/O.
 *
 * Rules (documented):
 * - progress percentage = current / target × 100, clamped to [0, 100].
 * - remaining amount = target − current (never negative; current ≤ target is
 *   enforced at validation time).
 * - days remaining = whole days left until the deadline, ceil'd so a deadline
 *   later today still counts as a day. Overdue/today deadlines clamp to 0.
 * - required monthly savings = remaining / months remaining, where months are
 *   estimated in 30-day months and ceil'd (at least one month). It is null when
 *   there is no deadline, or when the deadline is today/overdue and the goal is
 *   not yet complete (it can no longer be hit). Completed goals need 0/mo.
 * - status: completed → overdue → behind/on_track (deadline pace) → on_track.
 *   "behind" means actual progress lags the linear schedule between createdAt
 *   and deadline. Without a deadline a goal is on_track.
 */

export type GoalStatus = 'on_track' | 'behind' | 'completed' | 'overdue';

export interface GoalMathInput {
  targetAmountPaise: number;
  currentAmountPaise: number;
  deadline: Date | null;
  createdAt: Date;
}

export interface GoalMath {
  progressPercentage: number;
  remainingPaise: number;
  daysRemaining: number | null;
  requiredMonthlySavingsPaise: number | null;
  status: GoalStatus;
}

const DAY_MS = 86_400_000;
const round2 = (value: number): number => Math.round(value * 100) / 100;

export function calculateGoalMath(
  input: GoalMathInput,
  now: Date = new Date()
): GoalMath {
  const { targetAmountPaise, currentAmountPaise, deadline, createdAt } = input;

  const remainingPaise = Math.max(0, targetAmountPaise - currentAmountPaise);
  const progressPercentage = Math.min(
    100,
    Math.max(0, round2((currentAmountPaise / targetAmountPaise) * 100))
  );
  const completed = remainingPaise === 0;

  let daysRemaining: number | null = null;
  let requiredMonthlySavingsPaise: number | null = null;

  if (deadline) {
    const diffMs = deadline.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / DAY_MS));
    const overdue = !completed && now.getTime() > deadline.getTime();

    if (completed) {
      requiredMonthlySavingsPaise = 0;
    } else if (!overdue && diffMs > 0) {
      const months = Math.ceil(daysRemaining / 30);
      requiredMonthlySavingsPaise = months > 0 ? Math.ceil(remainingPaise / months) : null;
    } else {
      // Overdue or deadline is today with money left: can no longer be reached.
      requiredMonthlySavingsPaise = null;
    }
  }

  let status: GoalStatus;
  if (completed) {
    status = 'completed';
  } else if (deadline && now.getTime() > deadline.getTime()) {
    status = 'overdue';
  } else if (deadline) {
    const spanMs = deadline.getTime() - createdAt.getTime();
    const elapsed = spanMs <= 0 ? 1 : (now.getTime() - createdAt.getTime()) / spanMs;
    const expected = Math.min(1, Math.max(0, elapsed));
    const actual = targetAmountPaise === 0 ? 1 : currentAmountPaise / targetAmountPaise;
    status = actual < expected ? 'behind' : 'on_track';
  } else {
    status = 'on_track';
  }

  return {
    progressPercentage,
    remainingPaise,
    daysRemaining,
    requiredMonthlySavingsPaise,
    status,
  };
}