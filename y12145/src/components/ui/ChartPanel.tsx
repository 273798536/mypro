import { useState } from 'react';
import { useSolarSailStore } from '@/store/solarSailStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { TrendingUp, Filter } from 'lucide-react';

type ChartType = 'velocity' | 'acceleration' | 'pressure' | 'position';

export function ChartPanel() {
  const { orbitData } = useSolarSailStore();
  const [chartType, setChartType] = useState<ChartType>('velocity');

  const chartData = orbitData.slice(-200).map((point, index) => ({
    time: Math.floor(point.time / 60),
    velocity: point.velocity * 1e6,
    acceleration: point.acceleration * 1e9,
    pressure: point.radiationPressure * 1e6,
    positionX: point.x,
    positionY: point.y
  }));

  const chartConfigs: Record<ChartType, { lines: { key: string; color: string; label: string }[]; yLabel: string }> = {
    velocity: {
      lines: [{ key: 'velocity', color: '#00d4aa', label: '速度 (×10⁻⁶ m/s)' }],
      yLabel: '速度'
    },
    acceleration: {
      lines: [{ key: 'acceleration', color: '#ff6b35', label: '加速度 (×10⁻⁹ m/s²)' }],
      yLabel: '加速度'
    },
    pressure: {
      lines: [{ key: 'pressure', color: '#06b6d4', label: '光压 (×10⁻⁶ N)' }],
      yLabel: '光压'
    },
    position: {
      lines: [
        { key: 'positionX', color: '#ff6b35', label: 'X 位置' },
        { key: 'positionY', color: '#00d4aa', label: 'Y 位置' }
      ],
      yLabel: '位置'
    }
  };

  const config = chartConfigs[chartType];

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
          轨道数据曲线
        </h2>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-teal-500"
          >
            <option value="velocity">速度曲线</option>
            <option value="acceleration">加速度曲线</option>
            <option value="pressure">光压曲线</option>
            <option value="position">位置曲线</option>
          </select>
        </div>
      </div>

      <div className="h-48">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="time" 
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                label={{ value: '时间 (分)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }}
              />
              <YAxis 
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                width={60}
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
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {config.lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  name={line.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">开始模拟后显示曲线</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-xs text-slate-500">数据点数</div>
          <div className="font-mono text-lg text-white">{orbitData.length}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">最大速度</div>
          <div className="font-mono text-lg text-teal-400">
            {orbitData.length > 0 
              ? Math.max(...orbitData.map(d => d.velocity)).toExponential(2)
              : '0'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">平均光压</div>
          <div className="font-mono text-lg text-orange-400">
            {orbitData.length > 0 
              ? (orbitData.reduce((sum, d) => sum + d.radiationPressure, 0) / orbitData.length).toExponential(2)
              : '0'}
          </div>
        </div>
      </div>
    </div>
  );
}
