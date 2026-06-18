import { useNavigate, useParams } from 'react-router-dom';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { Version, Metric } from '@/types';
import { cn } from '@/utils/helpers';

interface RadarCompareProps {
  baseVersion: Version;
  targetVersion: Version;
  onMetricClick?: (metric: Metric) => void;
}

export default function RadarCompare({
  baseVersion,
  targetVersion,
  onMetricClick,
}: RadarCompareProps) {
  const navigate = useNavigate();
  const params = useParams();

  const data = targetVersion.metrics.map((targetMetric) => {
    const baseMetric = baseVersion.metrics.find((m) => m.name === targetMetric.name);
    return {
      metric: targetMetric.name,
      [baseVersion.versionNumber]: baseMetric?.value || 0,
      [targetVersion.versionNumber]: targetMetric.value,
      isAbnormal: targetMetric.isAbnormal,
      fullMark: 100,
    };
  });

  const handleClick = (entry: { payload: { metric: string; isAbnormal: boolean } }) => {
    if (entry.payload.isAbnormal) {
      navigate(`/versions/${targetVersion.id}`);
    }
    const metric = targetVersion.metrics.find((m) => m.name === entry.payload.metric);
    if (metric) {
      onMetricClick?.(metric);
    }
  };

  const CustomDot = (props: {
    cx: number;
    cy: number;
    dataKey: string;
    payload: { isAbnormal: boolean };
    stroke?: string;
  }) => {
    const { cx, cy, dataKey, payload, stroke } = props;
    const isTarget = dataKey === targetVersion.versionNumber;
    const isAbnormal = isTarget && payload.isAbnormal;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={isAbnormal ? 6 : 4}
        fill={stroke}
        stroke={isAbnormal ? '#EF4444' : stroke}
        strokeWidth={isAbnormal ? 2 : 1}
        className={cn(isAbnormal && 'animate-breathe cursor-pointer')}
      />
    );
  };

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-color p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-white">多维度属性对比</h3>
        <p className="text-xs text-gray-400">
          点击异常点查看版本说明和计算口径
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#475569" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #475569',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
              itemStyle={{ fontFamily: 'JetBrains Mono' }}
            />
            <Legend
              wrapperStyle={{ fontFamily: 'Space Grotesk', fontSize: '12px' }}
            />
            <Radar
              name={baseVersion.versionNumber}
              dataKey={baseVersion.versionNumber}
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.2}
              dot={<CustomDot />}
              onClick={handleClick}
            />
            <Radar
              name={targetVersion.versionNumber}
              dataKey={targetVersion.versionNumber}
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.2}
              dot={<CustomDot />}
              onClick={handleClick}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
