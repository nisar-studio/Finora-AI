/** Mirrors the backend `POST /api/v1/coach/query` response. */
export interface CoachResponse {
  answer: string;
  suggestedQuestions: string[];
  sourcesUsed: string[];
}

export interface CoachQueryInput {
  question: string;
}

/** Source identifiers returned by the backend `sourcesUsed` array. */
export const COACH_SOURCES = [
  'current_month_summary',
  'top_categories',
  'category_trends',
  'monthly_trend',
  'savings_goals',
] as const;
export type CoachSource = (typeof COACH_SOURCES)[number];

const SOURCE_LABELS: Record<string, string> = {
  current_month_summary: 'This month summary',
  top_categories: 'Top categories',
  category_trends: 'Category trends',
  monthly_trend: '6-month trend',
  savings_goals: 'Savings goals',
};

/** Human label for a backend source identifier; falls back to the raw id. */
export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

/** Starter questions shown in the welcome empty state. */
export const COACH_EXAMPLE_QUESTIONS = [
  'Where am I spending the most?',
  'Am I saving enough this month?',
  'How am I doing with my savings goals?',
  'What should I improve about my spending?',
] as const;