import { Lightbulb, Sparkles } from 'lucide-react';
import { sourceLabel } from '../../types/coach';

interface CoachResponseCardProps {
  answer: string;
  suggestedQuestions: string[];
  sourcesUsed: string[];
  onSuggest: (question: string) => void;
  isPending: boolean;
}

export function CoachResponseCard({
  answer,
  suggestedQuestions,
  sourcesUsed,
  onSuggest,
  isPending,
}: CoachResponseCardProps) {
  return (
    <div className="max-w-[85%] rounded-lg border border-ink/10 bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-brand">
        <Sparkles className="size-3.5" aria-hidden="true" />
        Finora Coach
      </div>

      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{answer}</p>

      {suggestedQuestions.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <Lightbulb className="size-3.5" aria-hidden="true" />
            Try asking
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                disabled={isPending}
                onClick={() => onSuggest(question)}
                className="rounded-md border border-ink/10 bg-surface px-3 py-1.5 text-left text-xs text-ink transition-colors hover:border-brand disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sourcesUsed.length > 0 ? (
        <div className="mt-4 border-t border-ink/10 pt-3">
          <p className="mb-1.5 text-xs font-medium text-ink-muted">Sources used</p>
          <ul className="flex flex-wrap gap-1.5">
            {sourcesUsed.map((source) => (
              <li
                key={source}
                className="rounded-full border border-ink/10 px-2 py-0.5 text-xs text-ink-muted"
              >
                {sourceLabel(source)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}