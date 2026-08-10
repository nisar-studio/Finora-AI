import type { ReactNode } from 'react';

export function IntelligencePanel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-lg border border-ink/10 bg-surface p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      <div className="flex-1">{children}</div>
    </section>
  );
}