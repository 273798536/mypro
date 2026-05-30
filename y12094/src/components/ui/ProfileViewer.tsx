import { X, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import useAppStore from '@/store/useAppStore';

export default function ProfileViewer() {
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const setSelectedProfile = useAppStore((state) => state.setSelectedProfile);
  const slopeThreshold = useAppStore((state) => state.slopeThreshold);

  if (!selectedProfile) return null;

  const maxElevation = Math.max(...selectedProfile.elevationData.map((d) => d.y));
  const minElevation = Math.min(...selectedProfile.elevationData.map((d) => d.y));
  const avgSlope = selectedProfile.elevationData.reduce((sum, d) => sum + d.slope, 0) / selectedProfile.elevationData.length;

  const highRiskPoints = selectedProfile.elevationData.filter((d) => d.slope > slopeThreshold).length;

  return (
    <div className="absolute bottom-28 left-4 w-96 bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <h3 className="text-white font-medium text-sm">地形剖面图</h3>
        </div>
        <button
          onClick={() => setSelectedProfile(null)}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="text-slate-400 text-xs">最大高程</div>
            <div className="text-white font-mono text-lg">{maxElevation.toFixed(1)}m</div>
          </div>
          <div className="flex-1">
            <div className="text-slate-400 text-xs">最小高程</div>
            <div className="text-white font-mono text-lg">{minElevation.toFixed(1)}m</div>
          </div>
          <div className="flex-1">
            <div className="text-slate-400 text-xs">平均坡度</div>
            <div className={`font-mono text-lg ${avgSlope > slopeThreshold ? 'text-orange-400' : 'text-white'}`}>
              {avgSlope.toFixed(1)}°
            </div>
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selectedProfile.elevationData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="x" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'y') return [`${value.toFixed(1)}m`, '高程'];
                  return [value, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <div className="text-slate-400 text-xs mb-2">坡度分布</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedProfile.elevationData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="x" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 60]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}°`, '坡度']}
                />
                <ReferenceLine y={slopeThreshold} stroke="#f97316" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="slope"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {highRiskPoints > 0 && (
          <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="text-orange-400 text-xs font-medium">
              ⚠️ 有 {highRiskPoints} 个点坡度超过阈值 ({slopeThreshold}°)
            </div>
          </div>
        )}
        <div className="mt-3 text-slate-500 text-xs">
          提示: 点击地形任意位置可生成该位置的剖面图
        </div>
      </div>
    </div>
  );
}
