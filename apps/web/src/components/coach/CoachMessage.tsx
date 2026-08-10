import { RotateCw } from 'lucide-react';
import type { CoachResponse } from '../../types/coach';
import { CoachResponseCard } from './CoachResponseCard';

export interface CoachExchange {
  id: number;
  question: string;
  response: CoachResponse | null;
  failed: boolean;
  failureMessage: string | null;
}

interface CoachMessageProps {
  exchange: CoachExchange;
  isPending: boolean;
  onRetry: (id: number, question: string) => void;
  onSuggest: (question: string) => void;
}

export function CoachMessage({ exchange, isPending, onRetry, onSuggest }: CoachMessageProps) {
  return (
    <div className="space-y-3">
      <div className="ml-auto max-w-[85%] rounded-lg bg-ink px-4 py-2 text-sm text-ink-inverse">
        {exchange.question}
      </div>

      {exchange.response ? (
        <CoachResponseCard
          answer={exchange.response.answer}
          suggestedQuestions={exchange.response.suggestedQuestions ?? []}
          sourcesUsed={exchange.response.sourcesUsed ?? []}
          onSuggest={onSuggest}
          isPending={isPending}
        />
      ) : exchange.failed ? (
        <div className="max-w-[85%] rounded-lg border border-red-400/30 bg-red-400/5 p-4">
          <p className="text-sm font-medium text-red-400">Couldn’t get an answer</p>
          <p className="mt-1 text-sm text-ink-muted">
            {exchange.failureMessage ?? 'Finora couldn’t connect this time. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => onRetry(exchange.id, exchange.question)}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90"
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : isPending ? (
        <div className="flex max-w-[85%] items-center gap-2 rounded-lg border border-ink/10 bg-surface p-4">
          <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden="true" />
          <span className="size-2 animate-pulse rounded-full bg-brand [animation-delay:150ms]" aria-hidden="true" />
          <span className="size-2 animate-pulse rounded-full bg-brand [animation-delay:300ms]" aria-hidden="true" />
          <span className="ml-1 text-sm text-ink-muted">Analyzing your Finora data…</span>
        </div>
      ) : null}
    </div>
  );
}