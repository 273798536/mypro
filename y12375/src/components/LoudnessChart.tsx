import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area } from 'recharts';
import { useAudioStore } from '../store/useAudioStore';

interface LoudnessChartProps {
  height?: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const LoudnessChart: React.FC<LoudnessChartProps> = ({ height = 200 }) => {
  const { selectedAudioFile, segments, viewStart, viewEnd, currentTime } = useAudioStore();

  if (!selectedAudioFile) {
    return (
      <div className="w-full flex items-center justify-center bg-[#1a1f36] rounded-lg" style={{ height }}>
        <span className="text-gray-500">请选择音频文件</span>
      </div>
    );
  }

  const visibleLoudnessData = selectedAudioFile.loudnessData.filter(
    (d) => d.time >= viewStart && d.time <= viewEnd
  );

  const chartData = visibleLoudnessData.map((d) => ({
    ...d,
    timeLabel: formatTime(d.time),
  }));

  const visibleSegments = segments.filter(
    (s) => s.audioFileId === selectedAudioFile.id && s.endTime > viewStart && s.startTime < viewEnd
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-gray-400 mb-1">时间: {label}</p>
          <p className="text-sm font-bold text-cyan-400">
            响度: {payload[0].value.toFixed(1)} LUFS
          </p>
          {payload[0].value > -16 && (
            <p className="text-xs text-red-400 mt-1">⚠️ 超过合规阈值</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1a1f36] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">响度分析</h3>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-cyan-500"></span>
            响度曲线
          </span>
          <span className="flex items-center gap-1">
            <span className="w-8 h-0.5 bg-red-500 border-dashed"></span>
            合规阈值 (-16 LUFS)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255, 107, 53, 0.5)' }}></span>
            广告片段
          </span>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            
            {visibleSegments.map((segment, index) => (
              <ReferenceLine
                key={segment.id}
                x={segment.startTime}
                stroke={segment.type === 'ad' ? 'rgba(255, 107, 53, 0.5)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={segment.type === 'ad' ? 2 : 1}
                strokeDasharray={segment.type === 'ad' ? '0' : '3 3'}
              />
            ))}
            
            <ReferenceLine y={-16} stroke="#ff6b35" strokeDasharray="5 5" strokeWidth={2} />
            
            <ReferenceLine x={currentTime} stroke="#00ffa3" strokeWidth={2} />
            
            <XAxis
              dataKey="time"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              tickFormatter={(value) => formatTime(value)}
              interval="preserveStartEnd"
            />
            
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              domain={[-70, -5]}
              tickFormatter={(value) => `${value}`}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <defs>
              <linearGradient id="loudnessGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#loudnessGradient)"
            />
            
            <Line
              type="monotone"
              dataKey="value"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#00d4ff', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
