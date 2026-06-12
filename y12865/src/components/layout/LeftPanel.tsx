import { useMissionStore } from '@/store/missionStore';
import { useFilterStore } from '@/store/filterStore';
import { useSceneStore } from '@/store/sceneStore';
import { riskColors, riskLabels, statusColors, statusLabels } from '@/utils/color';
import type { RiskLevel, DataStatus, TrajectoryMode } from '@/types';
import {
  Search,
  RotateCcw,
  Layers,
  Scissors,
  ChevronRight,
  Anchor,
  Waves,
  Calendar,
  User,
  Tag,
  Eye,
  EyeOff,
} from 'lucide-react';

const trajectoryModes: { mode: TrajectoryMode; label: string }[] = [
  { mode: 'raw', label: '原始' },
  { mode: 'cleaned', label: '清洗' },
  { mode: 'both', label: '对比' },
];

export default function LeftPanel() {
  const missions = useMissionStore((s) => s.missions);
  const currentMission = useMissionStore((s) => s.currentMission);
  const selectMission = useMissionStore((s) => s.selectMission);
  const { riskLevels, statuses, searchQuery, toggleRiskLevel, toggleStatus, setSearchQuery, resetFilters } =
    useFilterStore();
  const trajectoryMode = useSceneStore((s) => s.trajectoryMode);
  const setTrajectoryMode = useSceneStore((s) => s.setTrajectoryMode);
  const clippingEnabled = useSceneStore((s) => s.clippingEnabled);
  const setClippingEnabled = useSceneStore((s) => s.setClippingEnabled);
  const clippingHeight = useSceneStore((s) => s.clippingHeight);
  const setClippingHeight = useSceneStore((s) => s.setClippingHeight);

  return (
    <div className="w-64 flex flex-col bg-[#0a1425]/95 backdrop-blur-md border-r border-cyan-500/15 overflow-hidden">
      <div className="px-4 py-3 border-b border-cyan-500/15 bg-gradient-to-r from-[#0d1a2d] to-transparent">
        <h2 className="text-xs font-mono text-cyan-400 tracking-wider flex items-center gap-2">
          <Anchor size={12} className="text-cyan-400" />
          探测任务
        </h2>
        <p className="text-[10px] text-gray-500 mt-0.5">选择任务进行回放复盘</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 space-y-2">
          {missions.map((m) => {
            const active = currentMission?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => selectMission(m.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden ${
                  active
                    ? 'bg-cyan-500/15 border border-cyan-400/30 shadow-[0_0_16px_rgba(0,229,255,0.08)]'
                    : 'bg-[#0d1a2d]/60 border border-transparent hover:bg-cyan-500/8 hover:border-cyan-500/15'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-xs truncate ${active ? 'text-cyan-200' : 'text-gray-200'}`}>
                    {m.name}
                  </span>
                  <ChevronRight
                    size={12}
                    className={`text-gray-500 group-hover:text-cyan-400 transition-colors shrink-0 ml-2 ${
                      active ? 'text-cyan-400' : ''
                    }`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Calendar size={9} />
                    {m.date}
                  </span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Tag size={9} />
                    {m.version}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <User size={9} className="text-gray-600" />
                  <span className="text-[10px] text-gray-500">{m.operator}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {m.samplePoints.length} 点
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-cyan-500/10">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Search size={9} className="text-cyan-500/60" />
            筛选采样点
          </h3>

          <div className="relative mb-2.5">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索采样点..."
              className="w-full pl-7 pr-2.5 py-1.5 bg-[#0d1a2d] border border-cyan-500/15 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400/40 transition-colors"
            />
          </div>

          <div className="mb-2.5">
            <span className="text-[10px] text-gray-500 block mb-1.5">风险等级</span>
            <div className="flex flex-wrap gap-1">
              {(['safe', 'warning', 'danger'] as RiskLevel[]).map((level) => {
                const active = riskLevels.includes(level);
                return (
                  <button
                    key={level}
                    onClick={() => toggleRiskLevel(level)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                      active ? 'opacity-100' : 'opacity-40'
                    }`}
                    style={{
                      backgroundColor: riskColors[level] + '18',
                      color: riskColors[level],
                      border: `1px solid ${riskColors[level]}30`,
                    }}
                  >
                    {riskLabels[level]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-2.5">
            <span className="text-[10px] text-gray-500 block mb-1.5">数据状态</span>
            <div className="flex flex-wrap gap-1">
              {(['approved', 'pending', 'delayed', 'recollect'] as DataStatus[]).map((status) => {
                const active = statuses.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                      active ? 'opacity-100' : 'opacity-40'
                    }`}
                    style={{
                      backgroundColor: statusColors[status] + '18',
                      color: statusColors[status],
                      border: `1px solid ${statusColors[status]}30`,
                    }}
                  >
                    {statusLabels[status]}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-cyan-400 transition-colors"
          >
            <RotateCcw size={10} />
            重置筛选
          </button>
        </div>

        <div className="px-4 py-3 border-t border-cyan-500/10">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Waves size={9} className="text-cyan-500/60" />
            轨迹显示
          </h3>
          <div className="flex gap-1">
            {trajectoryModes.map(({ mode, label }) => {
              const active = trajectoryMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setTrajectoryMode(mode)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                      : 'bg-[#0d1a2d] text-gray-500 border border-transparent hover:text-gray-300 hover:border-cyan-500/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-cyan-500/10">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Scissors size={9} className="text-cyan-500/60" />
            深度剖切
          </h3>
          <button
            onClick={() => setClippingEnabled(!clippingEnabled)}
            className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[10px] transition-all mb-2 ${
              clippingEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                : 'bg-[#0d1a2d] text-gray-500 border border-transparent hover:text-gray-400'
            }`}
          >
            {clippingEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
            <span className="font-mono">{clippingEnabled ? '已开启' : '已关闭'}</span>
          </button>
          {clippingEnabled && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">剖切深度</span>
                <span className="text-[10px] font-mono text-cyan-300">{clippingHeight}m</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={clippingHeight}
                onChange={(e) => setClippingHeight(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>0m</span>
                <span>20m</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
