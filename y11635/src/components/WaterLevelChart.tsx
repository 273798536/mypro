import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useGameStore } from '../hooks/useGameStore';
import { SAFE_LEVEL, WARNING_LINE, OVERFLOW_LINE } from '../data/constants';

interface WaterLevelChartProps {
  height?: number;
}

export function WaterLevelChart({ height = 200 }: WaterLevelChartProps) {
  const { logs, reservoirLevel, round } = useGameStore();

  const chartData = [
    ...logs.map((log) => ({
      round: log.round,
      level: Math.round(log.reservoirLevel * 10) / 10,
      safeLine: SAFE_LEVEL,
      warningLine: WARNING_LINE,
      overflowLine: OVERFLOW_LINE,
    })),
    {
      round: round,
      level: Math.round(reservoirLevel * 10) / 10,
      safeLine: SAFE_LEVEL,
      warningLine: WARNING_LINE,
      overflowLine: OVERFLOW_LINE,
    },
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-slate-100 mb-3">水位变化曲线</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="round"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: '回合', position: 'bottom', fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            domain={[0, 100]}
            label={{ value: '水位', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`${value.toFixed(1)}`, '水位']}
            labelFormatter={(label) => `回合 ${label}`}
          />
          <ReferenceLine y={SAFE_LEVEL} stroke="#48bb78" strokeDasharray="4 4" label={{ value: '安全线', fill: '#48bb78', fontSize: 10 }} />
          <ReferenceLine y={WARNING_LINE} stroke="#ed8936" strokeDasharray="4 4" label={{ value: '预警线', fill: '#ed8936', fontSize: 10 }} />
          <ReferenceLine y={OVERFLOW_LINE} stroke="#f56565" strokeDasharray="4 4" label={{ value: '溢洪线', fill: '#f56565', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="level"
            stroke="#4299e1"
            strokeWidth={2}
            dot={{ fill: '#4299e1', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#63b3ed' }}
            name="水位"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
