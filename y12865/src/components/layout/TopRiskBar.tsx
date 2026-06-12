import { useMissionStore } from '@/store/missionStore';
import { useFilterStore } from '@/store/filterStore';
import { riskColors, riskLabels, statusColors, statusLabels } from '@/utils/color';
import type { RiskLevel, DataStatus } from '@/types';
import { Shield, ShieldAlert, ShieldX, CheckCircle, Clock, AlertTriangle, RotateCcw, Zap } from 'lucide-react';

const riskItems: { level: RiskLevel; icon: typeof Shield }[] = [
  { level: 'safe', icon: Shield },
  { level: 'warning', icon: ShieldAlert },
  { level: 'danger', icon: ShieldX },
];

const statusItems: { status: DataStatus; icon: typeof CheckCircle }[] = [
  { status: 'approved', icon: CheckCircle },
  { status: 'pending', icon: Clock },
  { status: 'delayed', icon: AlertTriangle },
  { status: 'recollect', icon: RotateCcw },
];

export default function TopRiskBar() {
  const riskSummary = useMissionStore((s) => s.riskSummary);
  const currentMission = useMissionStore((s) => s.currentMission);
  const { riskLevels, statuses, toggleRiskLevel, toggleStatus } = useFilterStore();

  if (!currentMission) return null;

  const total = currentMission.samplePoints.length;
  const approvedPct = total > 0 ? Math.round((riskSummary.approved / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#0d1a2d]/95 via-[#0a1628]/95 to-[#0d1a2d]/95 backdrop-blur-md border-b border-cyan-500/20">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-50" />
        </div>
        <div>
          <p className="text-xs font-mono text-cyan-300 tracking-wider flex items-center gap-2">
            <Zap size={12} className="text-cyan-400" />
            {currentMission.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-500 font-mono">{currentMission.version}</span>
            <span className="text-gray-700">·</span>
            <span className="text-[10px] text-gray-500">{currentMission.operator}</span>
            <span className="text-gray-700">·</span>
            <span className="text-[10px] text-gray-500">{currentMission.date}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">风险</span>
          {riskItems.map(({ level, icon: Icon }) => {
            const active = riskLevels.includes(level);
            return (
              <button
                key={level}
                onClick={() => toggleRiskLevel(level)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all hover:scale-105 ${active ? '' : 'opacity-40'}`}
                style={{
                  backgroundColor: active ? riskColors[level] + '18' : 'transparent',
                  border: `1px solid ${active ? riskColors[level] + '40' : 'transparent'}`,
                }}
                title={`${active ? '取消' : ''}筛选${riskLabels[level]}数据`}
              >
                <Icon size={12} style={{ color: riskColors[level] }} />
                <span className="text-xs font-mono" style={{ color: riskColors[level] }}>
                  {riskSummary[level]}
                </span>
                <span className="text-[10px] text-gray-400">{riskLabels[level]}</span>
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-gray-700/50" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">船队可用度</span>
          <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${approvedPct}%`,
                background: 'linear-gradient(90deg, #2ED573, #00E5FF)',
              }}
            />
          </div>
          <span className="text-xs font-mono text-green-400">{approvedPct}%</span>
        </div>

        <div className="w-px h-5 bg-gray-700/50" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">状态</span>
          {statusItems.map(({ status, icon: Icon }) => {
            const active = statuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all hover:scale-105 ${active ? '' : 'opacity-40'}`}
                style={{
                  backgroundColor: active ? statusColors[status] + '18' : 'transparent',
                  border: `1px solid ${active ? statusColors[status] + '40' : 'transparent'}`,
                }}
                title={`${active ? '取消' : ''}筛选${statusLabels[status]}数据`}
              >
                <Icon size={12} style={{ color: statusColors[status] }} />
                <span className="text-xs font-mono" style={{ color: statusColors[status] }}>
                  {riskSummary[status]}
                </span>
                <span className="text-[10px] text-gray-400">{statusLabels[status]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
