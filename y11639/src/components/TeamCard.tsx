import { SKILL_LABELS, TEAM_STATUS_LABELS } from '../types/game';
import type { RepairTeam } from '../types/game';

interface TeamCardProps {
  team: RepairTeam;
  isSelected: boolean;
  onClick: () => void;
}

export function TeamCard({ team, isSelected, onClick }: TeamCardProps) {
  const statusColors = {
    idle: 'border-emerald-500 bg-emerald-500/10',
    executing: 'border-orange-500 bg-orange-500/10',
    cooling: 'border-gray-500 bg-gray-500/10'
  };

  const statusBadgeColors = {
    idle: 'bg-emerald-500',
    executing: 'bg-orange-500 animate-pulse',
    cooling: 'bg-gray-500'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${statusColors[team.status]}
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-105' : ''}
        ${team.status === 'idle' ? 'hover:scale-102 hover:shadow-lg cursor-pointer' : 'cursor-not-allowed opacity-80'}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">{team.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusBadgeColors[team.status]}`}>
          {TEAM_STATUS_LABELS[team.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {team.skills.map(skill => (
          <span
            key={skill}
            className="px-2 py-0.5 bg-blue-500/30 text-blue-300 text-xs rounded-md"
          >
            {SKILL_LABELS[skill]}
          </span>
        ))}
      </div>

      {team.status === 'executing' && (
        <div className="text-sm text-orange-300">
          <div className="flex items-center gap-1">
            <span className="animate-spin">⚙</span>
            <span>执行中... 剩余 {team.executeRounds} 回合</span>
          </div>
          {team.currentTarget && (
            <div className="text-xs text-orange-400 mt-1">目标: {team.currentTarget}</div>
          )}
        </div>
      )}

      {team.status === 'cooling' && (
        <div className="text-sm text-gray-300">
          <div className="flex items-center gap-1">
            <span>⏱</span>
            <span>冷却中... 剩余 {team.cooldown} 回合</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
            <div
              className="bg-gray-400 h-1.5 rounded-full transition-all"
              style={{ width: `${(team.cooldown / Math.max(team.cooldown, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {team.status === 'idle' && (
        <div className="text-sm text-emerald-300 flex items-center gap-1">
          <span>✓</span>
          <span>随时可派遣</span>
        </div>
      )}
    </button>
  );
}