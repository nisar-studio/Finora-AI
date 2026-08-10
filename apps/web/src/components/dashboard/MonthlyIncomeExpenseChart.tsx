import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR, formatINRShort } from '../../types/money';
import { MonthlyTrendPoint } from '../../types/analytics';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthShortLabel(monthKey: string): string {
  const [, mm] = monthKey.split('-');
  return MONTH_LABELS[Number(mm) - 1] ?? monthKey;
}

const tooltipStyle = {
  background: '#101019',
  border: '1px solid #252530',
  color: '#e9e9f0',
  fontSize: 12,
};

export function MonthlyIncomeExpenseChart({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#252530" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={monthShortLabel}
            tick={{ fill: '#8b8b98', fontSize: 12 }}
            axisLine={{ stroke: '#252530' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatINRShort(Number(value))}
            tick={{ fill: '#8b8b98', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(value) => formatINR(Number(value))}
            cursor={{ fill: '#1b1b26' }}
            contentStyle={tooltipStyle}
          />
          <Legend wrapperStyle={{ color: '#8b8b98' }} />
          <Bar dataKey="incomePaise" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expensePaise" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}