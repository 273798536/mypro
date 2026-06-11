import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { CaliberDistribution } from '@/types';

interface CaliberPieChartProps {
  data: CaliberDistribution[];
}

export default function CaliberPieChart({ data }: CaliberPieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="card p-5 animate-fade-up opacity-0" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title">口径分布</h3>
        <span className="text-xs text-navy-500">共 {total} 笔流水</span>
      </div>
      <div className="divider-pattern mb-3" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              stroke="#FBFAF6"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B2545',
                border: 'none',
                borderRadius: '2px',
                color: '#F7F4EE',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                `${value} 笔（${((value / total) * 100).toFixed(1)}%）`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="square"
              iconSize={8}
              wrapperStyle={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
                color: '#2A436E',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
