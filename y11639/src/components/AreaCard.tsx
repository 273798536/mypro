import { AREA_TYPE_LABELS, POWER_STATUS_LABELS, SKILL_LABELS } from '../types/game';
import type { Area } from '../types/game';

interface AreaCardProps {
  area: Area;
  isSelectable: boolean;
  onClick: () => void;
}

const getAreaIcon = (type: string) => {
  switch (type) {
    case 'hospital':
      return '🏥';
    case 'residential':
      return '🏠';
    case 'commercial':
      return '🏢';
    case 'industrial':
      return '🏭';
    default:
      return '📍';
  }
};

const priorityColors: Record<number, string> = {
  1: 'bg-red-500 text-red-400',
  2: 'bg-orange-500 text-orange-400',
  3: 'bg-yellow-500 text-yellow-400',
  4: 'bg-blue-500 text-blue-400',
  5: 'bg-purple-500 text-purple-400',
  6: 'bg-gray-500 text-gray-400'
};

const powerStatusColors = {
  normal: 'bg-emerald-500 text-emerald-400',
  damaged: 'bg-yellow-500 text-yellow-400',
  blackout: 'bg-red-500 text-red-400',
  timeout: 'bg-red-700 text-red-300'
};

const getPriorityLabel = (p: number) => {
  if (p === 1) return '最高';
  if (p === 2) return '高';
  if (p === 3) return '中';
  if (p === 4) return '较低';
  if (p === 5) return '低';
  return '最低';
};

export function AreaCard({ area, isSelectable, onClick }: AreaCardProps) {
  const icon = getAreaIcon(area.type);

  return (
    <button
      onClick={onClick}
      disabled={area.powerStatus === 'normal' || area.powerStatus === 'timeout' || !isSelectable}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${area.powerStatus === 'normal'
          ? 'bg-slate-700/50 border-slate-600'
          : area.powerStatus === 'timeout'
            ? 'bg-red-900/30 border-red-700 cursor-not-allowed'
            : isSelectable
              ? 'bg-slate-700 border-slate-500 hover:bg-slate-600 hover:scale-102 hover:shadow-lg cursor-pointer'
              : 'bg-slate-700/50 border-slate-600 cursor-not-allowed'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="text-base font-bold text-white">{area.name}</h3>
            <span className="text-xs text-slate-400">{AREA_TYPE_LABELS[area.type]}</span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[area.priority] || priorityColors[1]}`}>
          P{area.priority} · {getPriorityLabel(area.priority)}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${powerStatusColors[area.powerStatus]}`}>
          {POWER_STATUS_LABELS[area.powerStatus]}
        </span>
        <span className="text-xs text-slate-400">
          需要: {SKILL_LABELS[area.requiredSkill]}
        </span>
      </div>

      {(area.powerStatus === 'blackout' || area.powerStatus === 'damaged') && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">超时倒计时</span>
            <span className={area.timeoutRounds <= 1 ? 'text-red-400 font-bold' : 'text-orange-400'}>
              {area.timeoutRounds} 回合
            </span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${area.timeoutRounds <= 1 ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.max(100 - ((4 - area.timeoutRounds) * 25), 0)}%` }}
            />
          </div>
        </div>
      )}

      {area.powerStatus === 'timeout' && (
        <div className="mt-2 p-2 bg-red-500/20 rounded-lg border border-red-500/50 text-center">
          <span className="text-red-400 font-bold text-sm">⚠ 已超时，不可抢修</span>
        </div>
      )}

      <div className="flex justify-between mt-3 text-xs text-slate-400">
        <span>影响用户: {area.userCount.toLocaleString()}</span>
        <span className="text-emerald-400">+{area.reward}</span>
      </div>
    </button>
  );
}