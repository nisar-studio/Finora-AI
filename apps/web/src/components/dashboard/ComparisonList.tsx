import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatPercent } from '../../types/money';
import { PeriodComparison } from '../../types/analytics';

interface ComparisonRow {
  label: string;
  change: number | null;
}

export function ComparisonList({ comparison }: { comparison: PeriodComparison }) {
  const rows: ComparisonRow[] = [
    { label: 'Income', change: comparison.incomeChangePercent },
    { label: 'Expenses', change: comparison.expenseChangePercent },
    { label: 'Savings', change: comparison.savingsChangePercent },
  ];

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const arrow = row.change === null ? 'null' : row.change > 0 ? 'up' : row.change < 0 ? 'down' : 'flat';
        return (
          <li key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">{row.label}</span>
            <span
              className={
                arrow === 'up'
                  ? 'flex items-center gap-1 font-medium text-emerald-400'
                  : arrow === 'down'
                    ? 'flex items-center gap-1 font-medium text-red-400'
                    : 'flex items-center gap-1 text-ink-muted'
              }
            >
              {arrow === 'up' ? (
                <ArrowUpRight className="size-4" aria-hidden="true" />
              ) : arrow === 'down' ? (
                <ArrowDownRight className="size-4" aria-hidden="true" />
              ) : (
                <Minus className="size-4" aria-hidden="true" />
              )}
              {formatPercent(row.change)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}