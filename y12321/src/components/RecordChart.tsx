import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { AnalysisRecord } from '../types';

interface RecordChartProps {
  record: AnalysisRecord;
}

export default function RecordChart({ record }: RecordChartProps) {
  const [chartType, setChartType] = useState<'line' | 'scatter'>('line');

  const lineData = record.timeSeriesData.map((d) => ({
    date: d.date.slice(5),
    [record.metricA]: d.valueA,
    [record.metricB]: d.valueB,
  }));

  const scatterData = record.timeSeriesData.map((d) => ({
    x: d.valueA,
    y: d.valueB,
    date: d.date,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setChartType('line')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            chartType === 'line'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          时间序列
        </button>
        <button
          onClick={() => setChartType('scatter')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            chartType === 'scatter'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          散点图
        </button>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                tick={{ fontSize: 10 }}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey={record.metricA}
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey={record.metricB}
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          ) : (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="x"
                name={record.metricA}
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                tickLine={false}
                label={{
                  value: record.metricA,
                  position: 'bottom',
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <YAxis
                dataKey="y"
                name={record.metricB}
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                tickLine={false}
                width={60}
                label={{
                  value: record.metricB,
                  angle: -90,
                  position: 'left',
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [value.toFixed(2), name]}
              />
              <Scatter
                name="数据点"
                data={scatterData}
                fill="#60a5fa"
                fillOpacity={0.7}
              />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
