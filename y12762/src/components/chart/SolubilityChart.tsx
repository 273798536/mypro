import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SolubilityDataPoint {
  temperature: number;
  solubility: number;
}

interface SolubilityChartProps {
  data: SolubilityDataPoint[];
  reagentName: string;
  highlightTemp?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: SolubilityDataPoint }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
        <p className="text-sm font-semibold text-[#1e3a5f]">
          温度: {label}°C
        </p>
        <p className="text-sm text-[#0d9488] mt-1">
          溶解度: {payload[0].value} g/100g水
        </p>
      </div>
    );
  }
  return null;
}

export default function SolubilityChart({
  data,
  reagentName,
  highlightTemp,
}: SolubilityChartProps) {
  return (
    <div className="w-full h-full">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-[#1e3a5f]">
          {reagentName} 溶解度曲线
        </h3>
      </div>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="temperature"
              label={{
                value: '温度 (°C)',
                position: 'insideBottom',
                offset: -5,
                style: { fill: '#1e3a5f', fontSize: 12 },
              }}
              tick={{ fill: '#374151', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              label={{
                value: '溶解度 (g/100g水)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#1e3a5f', fontSize: 12 },
              }}
              tick={{ fill: '#374151', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip />} />
            {highlightTemp !== undefined && (
              <ReferenceLine
                x={highlightTemp}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `${highlightTemp}°C`,
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="solubility"
              stroke="#0d9488"
              strokeWidth={3}
              dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
