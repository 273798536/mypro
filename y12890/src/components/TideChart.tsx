import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ZAxis,
} from 'recharts';
import { TideChartPoint } from '../types/tide';
import { DataStatus } from '../types/common';
import { formatDateTime, formatNumber } from '../utils/format';
import { DATA_STATUS_COLORS } from '../utils/color';

interface TideChartProps {
  data: TideChartPoint[];
  title?: string;
  explanation?: string;
}

interface TooltipPayload {
  payload: {
    time: Date;
    tideLevel: number;
    isHigh?: boolean;
    isLow?: boolean;
    isInterpolated: boolean;
    status: DataStatus;
  };
}

export const TideChart: React.FC<TideChartProps> = ({ data, title, explanation }) => {
  const [hoveredPoint, setHoveredPoint] = useState<TideChartPoint | null>(null);

  const chartData = data.map((d, index) => ({
    ...d,
    timeLabel: formatDateTime(d.time),
    statusColor: DATA_STATUS_COLORS[d.status],
    index,
  }));

  const highTides = chartData.filter(d => d.isHigh);
  const lowTides = chartData.filter(d => d.isLow);
  const interpolated = chartData.filter(d => d.isInterpolated);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload as unknown as TideChartPoint & { statusColor: string };

    return (
      <div className="bg-ocean-900 text-white p-3 rounded-lg shadow-xl border border-ocean-700 text-sm">
        <p className="font-semibold mb-2">{formatDateTime(point.time)}</p>
        <p className="font-mono text-lg text-tide-400 mb-2">
          潮位: {formatNumber(point.tideLevel)} m
        </p>
        {point.isHigh && <p className="text-tide-400">🌊 高潮位</p>}
        {point.isLow && <p className="text-ocean-300">📉 低潮位</p>}
        {point.isInterpolated && (
          <p className="text-status-pending text-xs mt-1">
            ⚠️ 该值为插值补全结果，建议后续补充实际观测数据
          </p>
        )}
        <div className="mt-2 pt-2 border-t border-ocean-700">
          <p className="text-xs text-ocean-300">
            数据质量：
            <span className="ml-1 font-medium" style={{ color: DATA_STATUS_COLORS[point.status] }}>
              {point.status === DataStatus.AVAILABLE ? '正常可用' :
               point.status === DataStatus.PENDING ? '暂缓使用' :
               point.status === DataStatus.NEED_REVIEW ? '需场长复核' : '建议重新采集'}
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 rounded-xl p-6">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-display text-white mb-1">{title}</h3>
          {explanation && (
            <p className="text-sm text-slate-400">{explanation}</p>
          )}
        </div>
      )}

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            onMouseMove={(e) => {
              if (e && e.activePayload && e.activePayload.length) {
                setHoveredPoint(e.activePayload[0].payload as TideChartPoint);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2DD4BF" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />

            <XAxis
              dataKey="timeLabel"
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              interval={Math.floor(chartData.length / 6)}
            />

            <YAxis
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `${v}m`}
              domain={['auto', 'auto']}
            />

            <ZAxis dataKey="index" range={[60, 60]} />

            <ReferenceLine y={2.5} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: '警戒水位', position: 'right', fill: '#F59E0B', fontSize: 10 }} />
            <ReferenceLine y={0.5} stroke="#F97316" strokeDasharray="5 5" label={{ value: '低水位', position: 'right', fill: '#F97316', fontSize: 10 }} />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="tideLevel"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={false}
              filter="url(#glow)"
              activeDot={{ r: 6, fill: '#2DD4BF', stroke: '#fff', strokeWidth: 2 }}
            />

            <Scatter dataKey="tideLevel" data={highTides} fill="#2DD4BF" shape="circle">
              {highTides.map((entry, index) => (
                <circle
                  key={`high-${index}`}
                  cx={0}
                  cy={0}
                  r={6}
                  fill="#2DD4BF"
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Scatter>

            <Scatter dataKey="tideLevel" data={lowTides} fill="#0EA5E9" shape="circle">
              {lowTides.map((entry, index) => (
                <circle
                  key={`low-${index}`}
                  cx={0}
                  cy={0}
                  r={6}
                  fill="#0EA5E9"
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Scatter>

            <Scatter dataKey="tideLevel" data={interpolated} fill="#F59E0B" shape="triangle">
              {interpolated.map((entry, index) => (
                <path
                  key={`interp-${index}`}
                  d="M 0 -6 L 5.2 3 L -5.2 3 Z"
                  fill="#F59E0B"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </Scatter>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-tide-400" />
          <span className="text-xs text-slate-400">高潮位</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-ocean-500" />
          <span className="text-xs text-slate-400">低潮位</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-status-pending" />
          <span className="text-xs text-slate-400">插值补全</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-0.5 bg-gradient-to-r from-tide-400 to-ocean-500" />
          <span className="text-xs text-slate-400">潮汐曲线</span>
        </div>
      </div>

      {hoveredPoint && (
        <div className="mt-4 p-3 bg-ocean-800/50 rounded-lg border border-ocean-700">
          <p className="text-sm text-slate-300">
            <span className="text-tide-400 font-medium">计算说明：</span>
            该时刻潮位基于调和分析法计算得出，综合了 M2、S2、K1、O1 四个主要分潮的影响。
            {hoveredPoint.isInterpolated && ' 由于原始数据缺失，已使用相邻记录进行线性插值补全。'}
          </p>
        </div>
      )}
    </div>
  );
};
