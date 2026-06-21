import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Scatter,
} from 'recharts';
import { LineChart as LineChartIcon, Info } from 'lucide-react';
import { useCalculationStore } from '@/store/calculationStore';
import { getBoundaryTypeLabel, getBoundaryTypeColor } from '@/utils/boundaryEngine';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
        <p className="font-medium text-slate-800 mb-1">{label}</p>
        <p className="text-slate-600">
          数值: <span className="font-semibold">{data.value}</span>
        </p>
        <p className="text-slate-600">
          阈值: <span className="font-semibold">{data.threshold}</span>
        </p>
        {data.isBoundary && data.boundaryType && (
          <p
            className="mt-1 font-medium"
            style={{ color: getBoundaryTypeColor(data.boundaryType) }}
          >
            ⚠️ {getBoundaryTypeLabel(data.boundaryType)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const BoundaryChart: React.FC = () => {
  const { currentResult } = useCalculationStore();
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  if (!currentResult) return null;

  const boundaryPoints = currentResult.chartData.filter((d) => d.isBoundary);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <LineChartIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">边界值趋势图</h3>
              <p className="text-xs text-slate-500">24小时路径计数与阈值对比</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500 rounded" />
              <span className="text-slate-500">实际值</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-slate-300 border-t border-dashed border-slate-400" />
              <span className="text-slate-500">阈值线</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-500">边界异常</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentResult.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <ReferenceLine
                y={100}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                label={{ value: '阈值 100', fill: '#64748b', fontSize: 11, position: 'right' }}
              />
              
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6, fill: '#2563eb' }}
              />

              <Scatter dataKey="value" data={boundaryPoints}>
                {boundaryPoints.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.boundaryType ? getBoundaryTypeColor(entry.boundaryType) : '#ef4444'}
                    stroke="white"
                    strokeWidth={2}
                    r={6}
                  />
                ))}
              </Scatter>

              {currentResult.chartData.map((entry, index) => (
                entry.isBoundary && (
                  <ReferenceLine
                    key={`ref-${index}`}
                    x={entry.name}
                    stroke={entry.boundaryType ? getBoundaryTypeColor(entry.boundaryType) : '#ef4444'}
                    strokeDasharray="3 3"
                    strokeOpacity={0.3}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">边界值判断说明</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                当数值触及阈值边界时，系统会自动标记并改变后续判断逻辑。
                <strong className="text-blue-700"> 空集合和零值不会被当作普通输入处理</strong>，
                它们会触发特殊的分支逻辑。外推越界时会保留变化前后的数值，便于后续重跑时参照历史记录。
                图中红色虚线标记了发生边界异常的时间点。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoundaryChart;
