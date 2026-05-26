import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ANOMALY_LABELS } from '../../types';

interface AnomalyBarChartProps {
  data: { type: string; count: number }[];
}

const COLORS = ['#ef4444', '#f59e0b', '#f59e0b', '#254bd1', '#8b5cf6'];

export default function AnomalyBarChart({ data }: AnomalyBarChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: ANOMALY_LABELS[item.type as keyof typeof ANOMALY_LABELS] || item.type,
  }));

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">异常类型分布</h3>
      <div className="h-72">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number) => [value + ' 笔', '数量']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            暂无异常数据
          </div>
        )}
      </div>
    </div>
  );
}
