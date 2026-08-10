import { formatINR } from '../../types/money';
import { CategoryBreakdown } from '../../types/analytics';

export function TopCategories({ categories }: { categories: CategoryBreakdown[] }) {
  const top = categories.slice(0, 6);

  if (top.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-muted">No spending yet in this period</p>;
  }

  return (
    <ul className="space-y-3">
      {top.map((entry) => (
        <li key={entry.category}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="capitalize text-ink">{entry.category}</span>
            <span className="text-ink-muted">
              {formatINR(entry.amountPaise)} · {entry.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.min(100, Math.max(2, entry.percentage))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}