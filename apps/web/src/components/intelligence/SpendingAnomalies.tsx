import { formatINR } from '../../types/money';
import { categoryLabel } from '../../types/transaction';
import { IntelligenceAnomaly, Severity } from '../../types/intelligence';
import { IntelligencePanel } from './IntelligencePanel';

const SEVERITY_STYLES: Record<Severity, string> = {
  low: 'bg-amber-400/15 text-amber-300',
  medium: 'bg-orange-400/15 text-orange-300',
  high: 'bg-red-400/15 text-red-300',
};

export function SpendingAnomalies({ anomalies }: { anomalies: IntelligenceAnomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <IntelligencePanel title="Unusual Spending">
        <p className="py-8 text-center text-sm text-ink-muted">
          No unusual spending detected in this window.
        </p>
      </IntelligencePanel>
    );
  }

  return (
    <IntelligencePanel title="Unusual Spending">
      <ul className="space-y-3">
        {anomalies.map((anomaly, index) => (
          <li key={`${anomaly.category}-${anomaly.date}-${index}`} className="flex items-start gap-3">
            <span
              className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[anomaly.severity]}`}
            >
              {anomaly.severity}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium capitalize text-ink">
                  {categoryLabel(anomaly.category)}
                </p>
                <p className="shrink-0 text-sm font-semibold text-ink">{formatINR(anomaly.amountPaise)}</p>
              </div>
              <p className="text-xs text-ink-muted">
                {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
                  new Date(anomaly.date)
                )}
                {' · '}
                {(anomaly.deviation * 100).toFixed(0)}% vs typical
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-ink/10 pt-3 text-xs text-ink-muted">
        Spending that stands out from your own typical patterns — statistical, not fraud detection or
        financial advice.
      </p>
    </IntelligencePanel>
  );
}