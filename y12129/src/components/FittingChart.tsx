import { useAnalysis } from '../context/AnalysisContext';
import {
  ScatterChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
} from 'recharts';
import { predictValue } from '../utils/leastSquares';

export default function FittingChart() {
  const { state } = useAnalysis();
  const { snapshot } = state;

  if (!snapshot) {
    return null;
  }

  const { correctedPoints, fittingParams } = snapshot;

  const validPoints = correctedPoints.filter(
    (p) => !p.isMissing && !p.isContaminated
  );

  const contaminatedPoints = correctedPoints.filter((p) => p.isContaminated);
  const missingPoints = correctedPoints.filter((p) => p.isMissing);

  const scatterData = validPoints.map((p) => ({
    x: p.x,
    y: p.measuredValue,
    corrected: p.correctedValue,
    name: p.pointName,
    type: '正常',
  }));

  const contaminatedData = contaminatedPoints.map((p) => ({
    x: p.x,
    y: p.measuredValue,
    corrected: p.correctedValue,
    name: p.pointName,
    type: '批次混入',
  }));

  const missingData = missingPoints.map((p) => ({
    x: p.x,
    y: p.designSize,
    name: p.pointName,
    type: '点位缺失',
  }));

  const designSize = validPoints[0]?.designSize ?? 50;
  const tolerance = validPoints[0]?.tolerance ?? 0.05;

  const minX = Math.min(...correctedPoints.map((p) => p.x)) - 0.5;
  const maxX = Math.max(...correctedPoints.map((p) => p.x)) + 0.5;

  const fittingLine = [
    { x: minX, y: predictValue(minX, fittingParams.slope, fittingParams.intercept) },
    { x: maxX, y: predictValue(maxX, fittingParams.slope, fittingParams.intercept) },
  ];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { x: number; y: number; name: string; type: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-bold text-sm text-gray-800">{data.name}</p>
          <p className="text-xs text-gray-500">类型: {data.type}</p>
          <p className="text-xs font-mono mt-1">
            测量值: <span className="text-primary-600">{data.y.toFixed(4)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">最小二乘拟合曲线</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="x"
              name="测量点序号"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="测量值"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              domain={['auto', 'auto']}
              tickFormatter={(value) => value.toFixed(3)}
            />
            <ZAxis type="number" range={[60, 60]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />

            <ReferenceLine
              y={designSize}
              stroke="#1e3a8a"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: '设计尺寸', position: 'right', fontSize: 11, fill: '#1e3a8a' }}
            />

            <ReferenceLine
              y={designSize + tolerance}
              stroke="#f97316"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: '+公差', position: 'right', fontSize: 10, fill: '#f97316' }}
            />
            <ReferenceLine
              y={designSize - tolerance}
              stroke="#f97316"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: '-公差', position: 'right', fontSize: 10, fill: '#f97316' }}
            />

            <Line
              data={fittingLine}
              type="linear"
              dataKey="y"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="拟合曲线"
            />

            <Scatter
              name="正常测点"
              data={scatterData}
              fill="#059669"
            />

            <Scatter
              name="批次混入"
              data={contaminatedData}
              fill="#f97316"
            />

            <Scatter
              name="点位缺失"
              data={missingData}
              fill="#dc2626"
              shape="x"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          拟合公式: y = {fittingParams.slope.toFixed(6)}x + {fittingParams.intercept.toFixed(6)}
        </span>
        <span>设计尺寸: {designSize} ± {tolerance} mm</span>
      </div>
    </div>
  );
}
