import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Version } from '@/types';

interface MetricTrendProps {
  versions: Version[];
  metricNames: string[];
}

export default function MetricTrend({ versions, metricNames }: MetricTrendProps) {
  const reversedVersions = [...versions].reverse();

  const data = reversedVersions.map((version) => {
    const item: Record<string, unknown> = {
      version: version.versionNumber,
      status: version.status,
    };
    metricNames.forEach((name) => {
      const metric = version.metrics.find((m) => m.name === name);
      if (metric) {
        item[name] = metric.value;
        item[`${name}_abnormal`] = metric.isAbnormal;
      }
    });
    return item;
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-color p-6">
      <h3 className="font-display font-semibold text-white mb-4">核心指标趋势</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="version"
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
            {metricNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isAbnormal = payload[`${name}_abnormal`];
                  const isWithdrawn = payload.status === 'withdrawn';
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isAbnormal ? 6 : 4}
                      fill={isWithdrawn ? '#6B7280' : colors[index % colors.length]}
                      stroke={isAbnormal ? '#EF4444' : 'none'}
                      strokeWidth={isAbnormal ? 2 : 0}
                      opacity={isWithdrawn ? 0.5 : 1}
                      className={isAbnormal ? 'animate-breathe' : ''}
                    />
                  );
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
