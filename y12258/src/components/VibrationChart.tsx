import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useGameStore } from '../store/useGameStore';

export const VibrationChart: React.FC = () => {
  const vibrationHistory = useGameStore(state => state.vibrationHistory);
  const windLevel = useGameStore(state => state.windLevel);

  const chartData = vibrationHistory.slice(-100).map((frame, index) => ({
    index,
    amplitude: frame.amplitude.toFixed(2),
    stress: (frame.maxStress / 10).toFixed(2),
    wind: frame.windLevel,
    time: new Date(frame.timestamp).toLocaleTimeString()
  }));

  return (
    <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">振动监测</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-cyan-400 rounded" />
            <span className="text-slate-400">振幅</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-orange-400 rounded" />
            <span className="text-slate-400">应力(×0.1)</span>
          </div>
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="index" 
              stroke="#64748b" 
              fontSize={10}
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="amplitude"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="stress"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>当前风载: Lv.{windLevel}</span>
        <span>红线: 危险阈值</span>
      </div>
    </div>
  );
};
