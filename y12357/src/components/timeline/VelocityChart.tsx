import { useMemo, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import type { AngularVelocityRecord, SamplingGap } from '../../types';
import { useFlywheelVelocities } from '../../store/useAppStore';
import { formatTimestamp } from '../../utils/formatters';

interface VelocityChartProps {
  currentTime: number;
  onTimeClick: (time: number) => void;
  onRangeChange: (range: [number, number] | null) => void;
  gaps: SamplingGap[];
}

export function VelocityChart({ currentTime, onTimeClick, onRangeChange, gaps }: VelocityChartProps) {
  const velocities = useFlywheelVelocities();
  const chartRef = useRef<HTMLDivElement>(null);
  
  const chartData = useMemo(() => {
    return velocities.map(v => ({
      time: v.timestamp,
      omega: v.omega,
      alpha: v.alpha * 10,
      torque: v.torque / 10,
      isValid: v.isValid,
    }));
  }, [velocities]);
  
  const gapRanges = useMemo(() => {
    return gaps.map(gap => ({
      start: gap.startTime,
      end: gap.endTime,
      color: gap.isInterpolated ? '#F59E0B' : '#EF4444',
    }));
  }, [gaps]);
  
  const minTime = chartData.length > 0 ? chartData[0].time : 0;
  const maxTime = chartData.length > 0 ? chartData[chartData.length - 1].time : 20;
  
  const handleBrushChange = (brushData: { startIndex?: number; endIndex?: number }) => {
    if (brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      const start = chartData[brushData.startIndex]?.time || minTime;
      const end = chartData[brushData.endIndex]?.time || maxTime;
      onRangeChange([start, end]);
    } else {
      onRangeChange(null);
    }
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="industrial-card p-2 text-xs">
          <div className="data-label">时间: {formatTimestamp(label)}</div>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ color: entry.color }} className="font-mono">
              {entry.name === 'omega' && `角速度: ${entry.value.toFixed(2)} rad/s`}
              {entry.name === 'alpha' && `角加速度: ${(entry.value / 10).toFixed(4)} rad/s²`}
              {entry.name === 'torque' && `力矩: ${(entry.value * 10).toFixed(2)} N·m`}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div ref={chartRef} className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          onClick={(data) => {
            if (data && data.activeLabel !== undefined) {
              onTimeClick(parseFloat(data.activeLabel));
            }
          }}
        >
          <defs>
            <linearGradient id="colorOmega" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorTorque" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#3A404B" opacity={0.5} />
          
          {gapRanges.map((gap, index) => (
            <ReferenceLine
              key={`gap-${index}`}
              x={gap.start}
              stroke={gap.color}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ 
                value: '缺口', 
                position: 'top', 
                fill: gap.color,
                fontSize: 10,
              }}
            />
          ))}
          
          <ReferenceLine
            x={currentTime}
            stroke="#EF4444"
            strokeWidth={2}
            label={{ 
              value: formatTimestamp(currentTime), 
              position: 'insideTopRight', 
              fill: '#EF4444',
              fontSize: 11,
              fontFamily: 'JetBrains Mono',
            }}
          />
          
          <XAxis
            dataKey="time"
            stroke="#525A68"
            tick={{ fill: '#8A94A6', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(value) => `${value.toFixed(1)}s`}
            domain={[minTime, maxTime]}
          />
          
          <YAxis
            stroke="#525A68"
            tick={{ fill: '#8A94A6', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(value) => value.toFixed(0)}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="omega"
            name="omega"
            stroke="#3B82F6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorOmega)"
            isAnimationActive={false}
          />
          
          <Area
            type="monotone"
            dataKey="torque"
            name="torque"
            stroke="#10B981"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#colorTorque)"
            isAnimationActive={false}
          />
          
          <Brush
            dataKey="time"
            height={30}
            stroke="#3B82F6"
            fill="#2A2F37"
            onChange={handleBrushChange}
            tickFormatter={(value) => `${value.toFixed(1)}s`}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <div className="absolute top-2 right-2 flex gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-tech-500" />
          <span className="text-industrial-400">角速度</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-alert-green" />
          <span className="text-industrial-400">力矩/10</span>
        </div>
      </div>
    </div>
  );
}
