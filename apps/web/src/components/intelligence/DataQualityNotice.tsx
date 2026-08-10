import { Info } from 'lucide-react';
import { IntelligenceDataQuality } from '../../types/intelligence';

export function DataQualityNotice({ dataQuality }: { dataQuality: IntelligenceDataQuality }) {
  const { transactionCount, expenseCount, monthsAvailable, sufficientHistory } = dataQuality;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${
        sufficientHistory ? 'border-ink/10 bg-surface' : 'border-amber-400/30 bg-amber-400/5'
      }`}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-medium text-ink">
          {sufficientHistory
            ? 'Enough history for a meaningful analysis'
            : 'Still building your history'}
        </p>
        <p className="mt-1 text-ink-muted">
          Based on {transactionCount} transaction{transactionCount === 1 ? '' : 's'} (
          {expenseCount} expense{expenseCount === 1 ? '' : 's'}) across {monthsAvailable} month
          {monthsAvailable === 1 ? '' : 's'} of activity.
        </p>
        {!sufficientHistory ? (
          <p className="mt-1 text-ink-muted">
            The insights below will sharpen as you record more months of spending.
          </p>
        ) : null}
      </div>
    </div>
  );
}