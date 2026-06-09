import type { SolubilityPoint } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

interface SolubilityChartProps {
  data: SolubilityPoint[];
  reagentName: string;
  currentTemp?: number;
  currentSolubility?: number;
}

export default function SolubilityChart({
  data,
  reagentName,
  currentTemp,
  currentSolubility,
}: SolubilityChartProps) {
  return (
    <div className="w-full h-80 bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {reagentName} - 溶解度曲线
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="temperature"
            label={{ value: '温度 (°C)', position: 'insideBottom', offset: -5, fill: '#1e3a5f' }}
            tick={{ fill: '#4b5563', fontSize: 12 }}
          />
          <YAxis
            label={{ value: '溶解度 (g/100g水)', angle: -90, position: 'insideLeft', fill: '#1e3a5f' }}
            tick={{ fill: '#4b5563', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            formatter={(value: number) => [`${value} g/100g水`, '溶解度']}
            labelFormatter={(label) => `温度: ${label}°C`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="solubility"
            name={reagentName}
            stroke="#0d9488"
            strokeWidth={3}
            dot={{ fill: '#0d9488', r: 4 }}
            activeDot={{ r: 6, fill: '#1e3a5f' }}
          />
          {currentTemp !== undefined && currentSolubility !== undefined && (
            <ReferenceDot
              x={currentTemp}
              y={currentSolubility}
              r={8}
              fill="#1e3a5f"
              stroke="#ffffff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
