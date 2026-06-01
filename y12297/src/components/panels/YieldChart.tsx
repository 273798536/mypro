import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { YieldRange, ExplanationReport } from '../../../shared/types';

interface YieldChartProps {
  yieldRange: YieldRange;
  report?: ExplanationReport | null;
}

export function YieldChart({ yieldRange, report }: YieldChartProps) {
  const chartData = useMemo(() => {
    const data = [
      { name: '预期下限', value: yieldRange.expectedMin, type: 'expected' },
      { name: '预期上限', value: yieldRange.expectedMax, type: 'expected' },
      { name: '历史下限', value: yieldRange.historicalMin, type: 'historical' },
      { name: '历史上限', value: yieldRange.historicalMax, type: 'historical' },
      { name: '业绩基准', value: yieldRange.benchmark, type: 'benchmark' },
    ];

    if (report?.claimedYield !== undefined && report?.claimedYield !== null) {
      data.push({
        name: '讲解声称',
        value: report.claimedYield,
        type: 'claimed',
      });
    }

    return data;
  }, [yieldRange, report]);

  const getBarColor = (type: string) => {
    switch (type) {
      case 'expected':
        return '#00D4FF';
      case 'historical':
        return '#2ED573';
      case 'benchmark':
        return '#FFA502';
      case 'claimed':
        return '#FF4757';
      default:
        return '#666';
    }
  };

  const maxValue = Math.max(...chartData.map((d) => d.value), 0);
  const yAxisMax = Math.ceil(maxValue * 1.2);

  const hasExaggeration =
    report?.claimedYield !== undefined &&
    report?.claimedYield > yieldRange.expectedMax * 1.1;

  return (
    <div className="bg-space-700/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300">收益对比分析</h4>
        {hasExaggeration && (
          <span className="text-xs text-risk-400 bg-risk-500/10 px-2 py-0.5 rounded">
            ⚠ 收益夸大
          </span>
        )}
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={{ stroke: '#1E3A5F' }}
              tickLine={{ stroke: '#1E3A5F' }}
            />
            <YAxis
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={{ stroke: '#1E3A5F' }}
              tickLine={{ stroke: '#1E3A5F' }}
              domain={[0, yAxisMax]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F1E36',
                border: '1px solid #1E3A5F',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#00D4FF', marginBottom: '4px' }}
              formatter={(value: number) => [`${value}%`, '收益率']}
            />
            <ReferenceLine
              y={yieldRange.expectedMax}
              stroke="#00D4FF"
              strokeDasharray="3 3"
              strokeOpacity={0.3}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-cyber-500" />
          <span className="text-xs text-gray-400">预期区间</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-trust-500" />
          <span className="text-xs text-gray-400">历史区间</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-warning-500" />
          <span className="text-xs text-gray-400">业绩基准</span>
        </div>
        {report?.claimedYield !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-risk-500" />
            <span className="text-xs text-gray-400">讲解声称</span>
          </div>
        )}
      </div>
    </div>
  );
}
