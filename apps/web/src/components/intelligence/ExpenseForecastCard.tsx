import { formatINR } from '../../types/money';
import { IntelligenceForecast } from '../../types/intelligence';
import { IntelligencePanel } from './IntelligencePanel';

export function ExpenseForecastCard({ forecast }: { forecast: IntelligenceForecast }) {
  const confidencePercent = `${(forecast.confidence * 100).toFixed(0)}%`;

  return (
    <IntelligencePanel title="Expense Forecast">
      {forecast.nextMonthExpensePaise !== null ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Estimated spending next month</p>
          <p className="text-3xl font-semibold text-ink">{formatINR(forecast.nextMonthExpensePaise)}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Model confidence</span>
              <span className="text-ink">{confidencePercent}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, Math.max(2, forecast.confidence * 100))}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-ink-muted">
            A statistical estimate based on your recent spending — not a promise about what you will
            actually spend.
          </p>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-ink">Not enough history yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Keep adding a few months of expenses and the model can estimate next month’s spending.
          </p>
        </div>
      )}
    </IntelligencePanel>
  );
}