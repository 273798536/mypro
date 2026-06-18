import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { Version } from '@/types';

interface BarCompareProps {
  baseVersion: Version;
  targetVersion: Version;
}

export default function BarCompare({ baseVersion, targetVersion }: BarCompareProps) {
  const data = targetVersion.metrics.map((targetMetric) => {
    const baseMetric = baseVersion.metrics.find((m) => m.name === targetMetric.name);
    return {
      metric: targetMetric.name,
      [baseVersion.versionNumber]: baseMetric?.value || 0,
      [targetVersion.versionNumber]: targetMetric.value,
      delta: targetMetric.delta,
      isAbnormal: targetMetric.isAbnormal,
    };
  });

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-color p-6">
      <h3 className="font-display font-semibold text-white mb-4">指标对比柱状图</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="metric"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              domain={[80, 100]}
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #475569',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'Space Grotesk', fontSize: '11px' }}
            />
            <Bar
              dataKey={baseVersion.versionNumber}
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey={targetVersion.versionNumber}
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isAbnormal ? '#EF4444' : '#10B981'}
                  className={entry.isAbnormal ? 'animate-breathe' : ''}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
