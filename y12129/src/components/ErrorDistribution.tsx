import { useAnalysis } from '../context/AnalysisContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

export default function ErrorDistribution() {
  const { state } = useAnalysis();
  const { snapshot } = state;

  if (!snapshot) {
    return null;
  }

  const { correctedPoints } = snapshot;

  const validPoints = correctedPoints.filter(
    (p) => !p.isMissing && !p.isContaminated
  );

  const chartData = validPoints.map((p) => {
    const errorBefore = p.measuredValue - p.designSize;
    const errorAfter = p.correctedValue - p.designSize;
    const isPassAfter = Math.abs(errorAfter) <= p.tolerance;

    return {
      name: p.pointName,
      校正前: parseFloat(errorBefore.toFixed(6)),
      校正后: parseFloat(errorAfter.toFixed(6)),
      公差: p.tolerance,
      isPassAfter,
      isContaminated: p.isContaminated,
      isMissing: p.isMissing,
    };
  });

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-bold text-sm text-gray-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs font-mono">
              {entry.name}: <span className="text-primary-600">{entry.value.toFixed(6)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (entry: { isPassAfter: boolean }) => {
    return entry.isPassAfter ? '#059669' : '#dc2626';
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">误差对比</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toFixed(3)}
              label={{ value: '误差 (mm)', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <ReferenceLine
              y={0}
              stroke="#1e3a8a"
              strokeWidth={2}
            />

            <ReferenceLine
              y={0.05}
              stroke="#f97316"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <ReferenceLine
              y={-0.05}
              stroke="#f97316"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            <Bar
              dataKey="校正前"
              fill="#9ca3af"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="校正后"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-center space-x-6 text-xs">
        <span className="flex items-center">
          <span className="w-3 h-3 bg-gray-400 rounded mr-1"></span>
          校正前
        </span>
        <span className="flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded mr-1"></span>
          校正后合格
        </span>
        <span className="flex items-center">
          <span className="w-3 h-3 bg-red-500 rounded mr-1"></span>
          校正后超差
        </span>
        <span className="flex items-center">
          <span className="w-3 h-0.5 bg-orange-500 mr-1"></span>
          公差带
        </span>
      </div>
    </div>
  );
}
