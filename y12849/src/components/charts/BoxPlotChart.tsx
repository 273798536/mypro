import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  ZAxis,
} from 'recharts';
import type { BatchEffectResult } from '../../types';

interface BoxPlotChartProps {
  data: BatchEffectResult['historicalData'];
  threshold: number;
  currentBatch: string;
}

export default function BoxPlotChart({ data, threshold, currentBatch }: BoxPlotChartProps) {
  const chartData = data.map((d, i) => ({
    ...d,
    x: i,
    min: d.gcContent - 0.5 - Math.random() * 0.3,
    q1: d.gcContent - 0.3 - Math.random() * 0.2,
    median: d.gcContent,
    q3: d.gcContent + 0.3 + Math.random() * 0.2,
    max: d.gcContent + 0.5 + Math.random() * 0.3,
    z: 100,
  }));

  const isCurrentBatch = (batch: string) => batch === currentBatch;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="batch"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={{ stroke: '#D1D5DB' }}
        />
        <YAxis
          domain={[43, 50]}
          label={{ value: 'GC含量 (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6B7280' } }}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={{ stroke: '#D1D5DB' }}
        />
        <ZAxis dataKey="z" range={[60, 60]} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload?.[0]) {
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-gray-200 rounded-[2px] shadow-lg p-3 text-xs">
                  <p className="font-semibold text-gray-900">{d.batch}</p>
                  <p className="text-gray-600">GC含量: <span className="font-mono font-medium">{d.gcContent.toFixed(1)}%</span></p>
                  <p className="text-gray-500">范围: {d.min.toFixed(1)}% - {d.max.toFixed(1)}%</p>
                  <p className="text-gray-500">中位数: {d.median.toFixed(1)}%</p>
                  {isCurrentBatch(d.batch) && (
                    <p className="text-red-600 font-medium mt-1">⚠ 当前批次，超出阈值</p>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine
          y={45 + threshold}
          stroke="#EF4444"
          strokeWidth={1}
          strokeDasharray="5 5"
          label={{ value: `阈值 +${threshold}%`, position: 'right', fill: '#EF4444', fontSize: 10 }}
        />
        <Scatter data={chartData} fill="#3B82F6">
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={isCurrentBatch(entry.batch) ? '#EF4444' : '#3B82F6'}
              stroke={isCurrentBatch(entry.batch) ? '#EF4444' : '#3B82F6'}
              strokeWidth={isCurrentBatch(entry.batch) ? 2 : 1}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
