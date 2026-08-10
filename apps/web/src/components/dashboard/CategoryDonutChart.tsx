import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '../../types/money';
import { CategoryBreakdown } from '../../types/analytics';

const PALETTE = [
  '#34d399',
  '#60a5fa',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#f87171',
  '#2dd4bf',
  '#f97316',
  '#818cf8',
  '#4ade80',
  '#e879f9',
  '#fb923c',
  '#facc15',
  '#94a3b8',
];

const tooltipStyle = {
  background: '#101019',
  border: '1px solid #252530',
  color: '#e9e9f0',
  fontSize: 12,
};

export function CategoryDonutChart({ data }: { data: CategoryBreakdown[] }) {
  const top = data.slice(0, 5);

  if (top.length === 0) {
    return <p className="py-16 text-center text-sm text-ink-muted">No expenses in this period</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={top}
            dataKey="amountPaise"
            nameKey="category"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            stroke="none"
          >
            {top.map((entry, index) => (
              <Cell key={entry.category} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatINR(Number(value))}
            contentStyle={tooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}