import { categoryLabel } from '../../types/transaction';
import { IntelligencePattern } from '../../types/intelligence';
import { IntelligencePanel } from './IntelligencePanel';

const RISING_THRESHOLD = 0.05;
const FALLING_THRESHOLD = -0.05;

export function SpendingPatterns({ patterns }: { patterns: IntelligencePattern[] }) {
  if (patterns.length === 0) {
    return (
      <IntelligencePanel title="Spending Patterns">
        <p className="py-8 text-center text-sm text-ink-muted">
          Add more transactions across a few months to reveal spending patterns.
        </p>
      </IntelligencePanel>
    );
  }

  const rising = patterns.filter((p) => p.trend > RISING_THRESHOLD);
  const falling = patterns.filter((p) => p.trend < FALLING_THRESHOLD);
  const recurring = patterns.filter((p) => p.recurring);

  return (
    <IntelligencePanel title="Spending Patterns">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Rising</p>
          {rising.length > 0 ? (
            <ul className="space-y-1.5">
              {rising.map((p) => (
                <li key={p.category} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-ink">{categoryLabel(p.category)}</span>
                  <span className="text-red-400">▲ {(p.trend * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No categories trending up.</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Falling</p>
          {falling.length > 0 ? (
            <ul className="space-y-1.5">
              {falling.map((p) => (
                <li key={p.category} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-ink">{categoryLabel(p.category)}</span>
                  <span className="text-brand">▼ {(Math.abs(p.trend) * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No categories trending down.</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Recurring</p>
          {recurring.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recurring.map((p) => (
                <span
                  key={p.category}
                  className="rounded-full border border-ink/10 bg-ink/5 px-3 py-1 text-xs capitalize text-ink"
                >
                  {categoryLabel(p.category)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No recurring categories yet.</p>
          )}
        </div>
      </div>
      <p className="mt-4 border-t border-ink/10 pt-3 text-xs text-ink-muted">
        Statistical trends over your recent months — a signal, not a recommendation.
      </p>
    </IntelligencePanel>
  );
}