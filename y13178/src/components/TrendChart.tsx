import { useMemo } from 'react';
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
import { useAppStore } from '@/store/useAppStore';
import { getChartData, formatDate } from '@/utils/format';
import type { SpeckleRecord } from '@/types';

const THRESHOLD = 3.5;

interface TrendChartProps {
  onJumpClick?: (record: SpeckleRecord) => void;
}

export default function TrendChart({ onJumpClick }: TrendChartProps) {
  const records = useAppStore((s) => s.records);
  const chartData = useMemo(() => getChartData(records), [records]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SpeckleRecord & {
        displayValue: number;
        label: string;
      };
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm shadow-xl">
          <div className="text-slate-300 mb-1">{data.label}</div>
          <div className="text-cyan-400 font-mono text-lg font-bold">
            {data.displayValue.toFixed(1)} μm
          </div>
          <div className="text-slate-400 text-xs mt-1">{data.source}</div>
          {data.isJumpPoint && (
            <div className="text-red-400 text-xs mt-1 font-medium">
              ⚠ 跳变点
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const handleClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length) {
      const record = data.activePayload[0].payload as SpeckleRecord;
      if (record.isJumpPoint && onJumpClick) {
        onJumpClick(record);
      }
    }
  };

  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isJumpPoint) {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={10}
            fill="rgba(239, 68, 68, 0.3)"
            className="animate-pulse"
          />
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill="#ef4444"
            stroke="#fff"
            strokeWidth={2}
          />
        </g>
      );
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="#06b6d4"
        stroke="#0f172a"
        strokeWidth={2}
      />
    );
  };

  const renderActiveDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isJumpPoint) {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={12}
            fill="rgba(239, 68, 68, 0.2)"
            className="animate-pulse"
          />
          <circle
            cx={cx}
            cy={cy}
            r={7}
            fill="#ef4444"
            stroke="#fff"
            strokeWidth={2}
          />
        </g>
      );
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#06b6d4"
        stroke="#fff"
        strokeWidth={2}
      />
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          onClick={handleClick}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

          <XAxis
            dataKey="label"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#475569' }}
            interval={1}
          />

          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#475569' }}
            tickFormatter={(v) => `${v}μm`}
            domain={[0, 'auto']}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569' }} />

          {/* 阈值线 */}
          <ReferenceLine
            y={THRESHOLD}
            stroke="#ef4444"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `阈值 ${THRESHOLD}μm`,
              position: 'right',
              fill: '#f87171',
              fontSize: 11,
            }}
          />

          {/* 主折线 */}
          <Line
            type="monotone"
            dataKey="displayValue"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={renderCustomDot}
            activeDot={renderActiveDot}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
