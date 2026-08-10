import { IntelligenceRisk } from '../../types/intelligence';

const LEVEL_STYLES: Record<IntelligenceRisk['level'], { label: string; bar: string; text: string }> = {
  low: { label: 'Low', bar: 'bg-brand', text: 'text-brand' },
  moderate: { label: 'Moderate', bar: 'bg-amber-400', text: 'text-amber-400' },
  high: { label: 'High', bar: 'bg-red-400', text: 'text-red-400' },
};

export function FinancialRiskCard({ risk }: { risk: IntelligenceRisk }) {
  const style = LEVEL_STYLES[risk.level];
  const width = `${Math.min(100, Math.max(2, risk.score))}%`;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-ink-muted">Financial Risk Indicator</p>
          <p className="mt-2 text-4xl font-semibold text-ink">{risk.score.toFixed(0)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${style.bar} text-ink-inverse`}>
          {style.label}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width }} />
      </div>

      <p className={`text-sm font-medium ${style.text}`}>
        {risk.level === 'high'
          ? 'Rising spend relative to your income.'
          : risk.level === 'moderate'
            ? 'Some signs of spending stress.'
            : 'Your spending looks steady.'}
      </p>
      <p className="text-xs text-ink-muted">
        A statistical indicator computed from your spending history — not a credit score, not
        financial advice.
      </p>
    </div>
  );
}