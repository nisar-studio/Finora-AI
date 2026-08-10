import { Sparkles } from 'lucide-react';
import { COACH_EXAMPLE_QUESTIONS } from '../../types/coach';

interface CoachWelcomeProps {
  onAsk: (question: string) => void;
  isPending: boolean;
}

export function CoachWelcome({ onAsk, isPending }: CoachWelcomeProps) {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-6 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-brand/10">
        <Sparkles className="size-5 text-brand" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium text-ink">Ask Finora anything about your money</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
        Every answer is grounded in your real transactions and savings goals — nothing invented.
        Start with one of these:
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {COACH_EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            disabled={isPending}
            onClick={() => onAsk(question)}
            className="rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-brand disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}