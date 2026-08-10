import type { Paise } from './money';

/** Mirrors the values computed by the backend `goalMath`. The frontend only displays them. */
export type GoalStatus = 'on_track' | 'behind' | 'completed' | 'overdue';

export interface GoalProgress {
  progressPercentage: number;
  remainingPaise: Paise;
  daysRemaining: number | null;
  requiredMonthlySavingsPaise: Paise | null;
  status: GoalStatus;
}

/** Mirrors the API goal model. Monetary amounts are integer paise. */
export interface Goal {
  id: string;
  clerkId: string;
  name: string;
  targetAmountPaise: Paise;
  currentAmountPaise: Paise;
  deadline: string | null;
  autosaveEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  progress: GoalProgress;
}

export interface CreateGoalInput {
  name: string;
  targetAmountPaise: Paise;
  currentAmountPaise?: Paise;
  deadline?: string | null;
  autosaveEnabled?: boolean;
}

export type UpdateGoalInput = Partial<CreateGoalInput>;

export function goalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'overdue':
      return 'Overdue';
    case 'behind':
      return 'Behind schedule';
    case 'on_track':
      return 'On track';
  }
}

/** "16 Nov 2026" style date. Returns '—' for a null/undefined deadline. */
export function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(deadline)
  );
}