interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
}

export function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-ink/10 bg-surface p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-1 text-xs text-ink-muted">{sub}</p> : null}
    </div>
  );
}