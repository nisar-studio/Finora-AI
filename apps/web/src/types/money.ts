/** All money flows as integer paise. ₹1,240.50 = 124050. */
export type Paise = number;

export function formatINR(paise: Paise): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatINRShort(paise: Paise): string {
  const rupees = paise / 100;
  if (rupees >= 1_000_000) {
    return `₹${(rupees / 100_000).toFixed(1)}L`;
  }
  if (rupees >= 1_000) {
    return `₹${(rupees / 1_000).toFixed(1)}k`;
  }
  return `₹${rupees.toFixed(0)}`;
}

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/** Formats a percentage like savings rate or change. Pass null for "no data". */
export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}