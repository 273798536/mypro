import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Scatter,
} from 'recharts';
import { AlertTriangle, Zap } from 'lucide-react';
import type { TideData, GenerationWindow } from '../types';
import { GENERATION_THRESHOLD_VALUE } from '../data/mockData';

interface TideChartProps {
  data: TideData[];
  generationWindows: GenerationWindow[];
}

interface ChartDataPoint {
  time: string;
  hour: number;
  level: number | null;
  predicted?: number;
  isMissing: boolean;
  isGenerating: boolean;
}

export function TideChart({ data, generationWindows }: TideChartProps) {
  const [activeWindow, setActiveWindow] = useState<number | null>(null);

  const chartData: ChartDataPoint[] = data.map(d => ({
    time: d.time,
    hour: d.hour,
    level: d.isMissing ? null : d.level,
    predicted: d.predicted,
    isMissing: d.isMissing,
    isGenerating: !d.isMissing && d.level >= GENERATION_THRESHOLD_VALUE,
  }));

  const isInWindow = (hour: number, window: GenerationWindow) => {
    return hour >= window.startHour && hour < window.endHour;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;
      if (!point) return null;

      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          {point.isMissing ? (
            <div className="mt-1">
              <p className="text-sm text-red-600 font-medium">⚠️ 数据缺测</p>
              {point.predicted && (
                <p className="text-sm text-gray-500">预测值: {point.predicted} m</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600 mt-1">
              潮位: <span className="font-semibold text-blue-600">{point.level} m</span>
            </p>
          )}
          {point.isGenerating && (
            <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> 发电窗口
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">潮位曲线与发电窗口</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">实际潮位</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">数据缺测</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-200"></div>
            <span className="text-gray-600">发电窗口</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-gray-600">发电阈值</span>
          </div>
        </div>
      </div>

      <div className="relative h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              {generationWindows.map((window, idx) => (
                <linearGradient key={idx} id={`windowGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={window.isValid ? '#10B981' : '#F59E0B'} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={window.isValid ? '#10B981' : '#F59E0B'} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

            {generationWindows.map((window, idx) => (
              <ReferenceLine
                key={`window-${idx}`}
                x={window.startHour}
                stroke={window.isValid ? '#10B981' : '#F59E0B'}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            ))}

            <ReferenceLine
              y={GENERATION_THRESHOLD_VALUE}
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: '发电阈值',
                position: 'insideTopRight',
                fill: '#D97706',
                fontSize: 11,
              }}
            />

            <XAxis
              dataKey="hour"
              tickFormatter={(h) => `${h.toString().padStart(2, '0')}:00`}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              interval={2}
              axisLine={{ stroke: '#D1D5DB' }}
            />

            <YAxis
              domain={[0, 5]}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              label={{
                value: '潮位 (m)',
                angle: -90,
                position: 'insideLeft',
                fill: '#6B7280',
                fontSize: 12,
              }}
              axisLine={{ stroke: '#D1D5DB' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="level"
              stroke="none"
              fill="url(#tideGradient)"
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="level"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
              connectNulls={false}
            />

            {chartData.filter(d => d.isMissing).map((d, idx) => (
              <Scatter
                key={`missing-${idx}`}
                data={[d]}
                fill="#EF4444"
                shape="circle"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {generationWindows.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">发电窗口详情:</p>
          <div className="flex flex-wrap gap-2">
            {generationWindows.map((window, idx) => (
              <button
                key={idx}
                onClick={() => setActiveWindow(activeWindow === idx ? null : idx)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeWindow === idx
                    ? window.isValid
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                      : 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                    : window.isValid
                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {window.isValid ? (
                    <Zap className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>
                    {window.startHour.toString().padStart(2, '0')}:00 - {window.endHour.toString().padStart(2, '0')}:00
                  </span>
                </div>
                <div className="text-xs mt-1 opacity-80">
                  发电 {window.estimatedOutput} MWh · 收益 ¥{window.estimatedRevenue.toLocaleString()}
                </div>
                {!window.isValid && window.conflictNote && (
                  <div className="text-xs mt-1 font-semibold">⚠️ {window.conflictNote}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
