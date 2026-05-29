import { useNavigate } from 'react-router-dom';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useGameStore } from '../store/gameStore';
import { artists } from '../data/artists';
import { stages } from '../data/stages';
import { minutesToTimeString } from '../utils/timeUtils';
import { ArrowLeft, Trophy, AlertTriangle, Clock, Wrench, Users, Flame, Cloud, Info } from 'lucide-react';

export default function ReportPage() {
  const navigate = useNavigate();
  const score = useGameStore((s) => s.score);
  const conflicts = useGameStore((s) => s.conflicts);
  const scheduleItems = useGameStore((s) => s.scheduleItems);
  const activatedWeather = useGameStore((s) => s.activatedWeather);
  const heatSnapshots = useGameStore((s) => s.heatSnapshots);
  const restart = useGameStore((s) => s.restart);

  const artistMap = new Map(artists.map((a) => [a.id, a]));
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  const radarData = [
    { dimension: '排期完整度', value: score.scheduling, fullMark: 100 },
    { dimension: '换场管理', value: score.changeover, fullMark: 100 },
    { dimension: '设备协调', value: score.equipment, fullMark: 100 },
    { dimension: '人流管控', value: score.crowd, fullMark: 100 },
    { dimension: '观众热度', value: score.heat, fullMark: 100 },
    { dimension: '天气应对', value: score.weather, fullMark: 100 },
  ];

  const barData = [
    { name: '换场超时', count: conflicts.filter((c) => c.type === 'changeover').length, color: '#F59E0B' },
    { name: '设备冲突', count: conflicts.filter((c) => c.type === 'equipment').length, color: '#FF2D55' },
    { name: '人流拥堵', count: conflicts.filter((c) => c.type === 'crowd').length, color: '#A855F7' },
  ];

  const sortedConflicts = [...conflicts].sort((a, b) => {
    const getMinTime = (c: typeof a) => {
      const items = scheduleItems.filter((si) => c.scheduleItemIds.includes(si.id));
      return items.length > 0 ? Math.min(...items.map((i) => i.startTime)) : 0;
    };
    return getMinTime(a) - getMinTime(b);
  });

  const totalError = conflicts.filter((c) => c.severity === 'error').length;
  const totalWarning = conflicts.filter((c) => c.severity === 'warning').length;

  const handleRestart = () => {
    restart();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-700 text-gray-400 text-xs hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={14} />
              返回
            </button>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              排期报告
            </h1>
          </div>
          <button
            onClick={handleRestart}
            className="px-4 py-2 rounded bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#FF6B35]/80 transition-colors"
          >
            重新挑战
          </button>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0F1419] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={16} className="text-[#FF6B35]" />
              <span className="text-xs text-gray-400">综合评分</span>
            </div>
            <div className="text-3xl font-bold text-cyan-400">{score.total}</div>
          </div>
          <div className="bg-[#0F1419] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-xs text-gray-400">冲突总数</span>
            </div>
            <div className="text-3xl font-bold text-red-400">{conflicts.length}</div>
            <div className="text-[10px] text-gray-500 mt-1">
              {totalError} 严重 / {totalWarning} 警告
            </div>
          </div>
          <div className="bg-[#0F1419] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-orange-400" />
              <span className="text-xs text-gray-400">平均热度</span>
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {heatSnapshots.length > 0
                ? Math.round(heatSnapshots.reduce((s, h) => s + h.heatValue, 0) / heatSnapshots.length)
                : 0}
            </div>
          </div>
          <div className="bg-[#0F1419] rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Cloud size={16} className="text-yellow-400" />
              <span className="text-xs text-gray-400">天气事件</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{activatedWeather.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-[#0F1419] rounded-lg p-5 border border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
              <Info size={14} className="text-cyan-400" />
              各维度评分雷达图
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 9 }} />
                <Radar name="得分" dataKey="value" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1 text-[10px] text-gray-500">
              <p>• 排期完整度：基于已安排艺人占全部艺人的比例，直接反映艺人时段覆盖情况</p>
              <p>• 换场管理：受同舞台艺人时段间隔影响，间隔不足换场时间则扣分</p>
              <p>• 设备协调：受多艺人共用设备时段重叠影响，重叠越多分越低</p>
              <p>• 人流管控：受相邻舞台高热度艺人时段重叠影响，热度叠加导致拥堵</p>
              <p>• 观众热度：受艺人时段是否在黄金时段（18-21点）及天气卡影响</p>
              <p>• 天气应对：已触发的天气卡数量越多，应对难度越大</p>
            </div>
          </div>

          <div className="bg-[#0F1419] rounded-lg p-5 border border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
              <Info size={14} className="text-cyan-400" />
              冲突类型分布
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Bar dataKey="count" name="次数" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Bar key={index} dataKey="count" fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1 text-[10px] text-gray-500">
              <p>• 换场超时：因艺人时段之间间隔不足舞台标准换场时间导致，需调整艺人时段或舞台</p>
              <p>• 设备冲突：因不同舞台的艺人时段中设备需求重叠（如重型音响同时使用）导致</p>
              <p>• 人流拥堵：因相邻舞台的高热度艺人时段重叠，散场与入场观众流交汇导致</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0F1419] rounded-lg p-5 border border-gray-800 mb-6">
          <h2 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-cyan-400" />
            排期总览
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left py-2 px-3">艺人</th>
                  <th className="text-left py-2 px-3">舞台</th>
                  <th className="text-left py-2 px-3">时段</th>
                  <th className="text-left py-2 px-3">设备需求</th>
                  <th className="text-left py-2 px-3">观众热度</th>
                  <th className="text-left py-2 px-3">冲突</th>
                </tr>
              </thead>
              <tbody>
                {scheduleItems
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((item) => {
                    const artist = artistMap.get(item.artistId);
                    const stage = stageMap.get(item.stageId);
                    const itemConflicts = conflicts.filter((c) =>
                      c.scheduleItemIds.includes(item.id)
                    );
                    return (
                      <tr key={item.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                        <td className="py-2 px-3 text-white font-medium">{artist?.name}</td>
                        <td className="py-2 px-3 text-gray-400">{stage?.name}</td>
                        <td className="py-2 px-3 text-gray-300 tabular-nums">
                          {minutesToTimeString(item.startTime)}-{minutesToTimeString(item.endTime)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {artist?.equipment.map((eq) => (
                              <span key={eq} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                                {eq}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="flex items-center gap-0.5 text-orange-400 text-xs">
                            <Flame size={10} />
                            {artist?.heat}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {itemConflicts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {itemConflicts.map((c) => (
                                <span
                                  key={c.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{
                                    background: c.severity === 'error' ? 'rgba(255,45,85,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: c.severity === 'error' ? '#FF2D55' : '#F59E0B',
                                  }}
                                >
                                  {c.type === 'changeover' ? '换场' : c.type === 'equipment' ? '设备' : '人流'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-green-500 text-xs">✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[10px] text-gray-500">
            上表每行的"冲突"列直接关联该艺人的时段安排和设备需求——若标记"换场"，说明该艺人时段与同舞台相邻艺人时段间隔不足；若标记"设备"，说明该艺人设备需求与其他艺人时段重叠；若标记"人流"，说明该艺人与相邻舞台艺人的时段重叠导致观众流冲突。
          </div>
        </div>

        <div className="bg-[#0F1419] rounded-lg p-5 border border-gray-800">
          <h2 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            冲突溯源时间线
          </h2>
          {sortedConflicts.length === 0 ? (
            <p className="text-green-400 text-sm">🎉 没有任何冲突！完美的排期方案。</p>
          ) : (
            <div className="space-y-3">
              {sortedConflicts.map((conflict) => {
                const typeLabel = conflict.type === 'changeover' ? '换场超时' : conflict.type === 'equipment' ? '设备冲突' : '人流拥堵';
                const typeIcon = conflict.type === 'changeover' ? <Clock size={14} /> : conflict.type === 'equipment' ? <Wrench size={14} /> : <Users size={14} />;
                const color = conflict.severity === 'error' ? '#FF2D55' : '#F59E0B';
                const relatedItems = scheduleItems.filter((si) =>
                  conflict.scheduleItemIds.includes(si.id)
                );

                return (
                  <div
                    key={conflict.id}
                    className="rounded-lg p-4"
                    style={{ background: 'rgba(15,23,42,0.6)', borderLeft: `3px solid ${color}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color }}>{typeIcon}</span>
                      <span className="text-xs font-bold" style={{ color }}>{typeLabel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>
                        {conflict.severity === 'error' ? '严重' : '警告'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{conflict.description}</p>
                    <div className="mt-2 p-2 rounded text-xs" style={{ background: '#1E293B' }}>
                      <span className="text-gray-500">溯源：</span>
                      <span className="text-gray-300">{conflict.sourceRef}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {relatedItems.map((item) => {
                        const a = artistMap.get(item.artistId);
                        const s = stageMap.get(item.stageId);
                        return (
                          <span key={item.id} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">
                            {a?.name} · {s?.name} · {minutesToTimeString(item.startTime)}-{minutesToTimeString(item.endTime)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
