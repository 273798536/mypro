import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

interface ChartDataPoint {
  index: number;
  original: number;
  recalculated: number;
}

interface CalibrationChartProps {
  data: ChartDataPoint[];
}

export default function CalibrationChart({ data }: CalibrationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-[#5a7aa0] mx-auto mb-3" />
        <p className="text-[#8ba7c7] text-sm">暂无对比数据</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d5a8e" />
          <XAxis
            dataKey="index"
            stroke="#8ba7c7"
            tick={{ fill: '#8ba7c7', fontSize: 11 }}
            axisLine={{ stroke: '#2d5a8e' }}
          />
          <YAxis
            stroke="#8ba7c7"
            tick={{ fill: '#8ba7c7', fontSize: 11 }}
            axisLine={{ stroke: '#2d5a8e' }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f2440',
              border: '2px solid #2d5a8e',
              borderRadius: 0,
              color: 'white',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            labelStyle={{ color: '#8ba7c7' }}
          />
          <Legend
            wrapperStyle={{ color: '#8ba7c7', fontSize: '12px' }}
          />
          <Line
            type="monotone"
            dataKey="original"
            name="原始值"
            stroke="#5a9fd4"
            strokeWidth={2}
            dot={{ fill: '#5a9fd4', r: 2 }}
            activeDot={{ r: 5, fill: '#5a9fd4' }}
          />
          <Line
            type="monotone"
            dataKey="recalculated"
            name="复算值"
            stroke="#d69e2e"
            strokeWidth={2}
            dot={{ fill: '#d69e2e', r: 2 }}
            activeDot={{ r: 5, fill: '#d69e2e' }}
            strokeDasharray="5 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
