import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/currency';

interface LossTrendChartProps {
  data: { date: string; amount: number }[];
}

export default function LossTrendChart({ data }: LossTrendChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    displayDate: item.date.slice(5),
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">汇损趋势</h3>
      <div className="h-72">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => formatCurrency(value, 'CNY', 0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number) => [formatCurrency(value, 'CNY'), '汇损金额']}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#254bd1"
                strokeWidth={2}
                dot={{ fill: '#254bd1', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#1e3a5f' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            暂无数据，请先导入数据并计算汇损
          </div>
        )}
      </div>
    </div>
  );
}
