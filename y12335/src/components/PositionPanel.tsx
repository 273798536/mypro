import { Briefcase } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/components/FilterBar';

export function PositionPanel() {
  const { positions, currentResult, getSkillById, shifts } = useStore();

  const getAssignedCount = (positionId: string) => {
    if (!currentResult) return 0;
    const positionShifts = shifts.filter(s => s.positionId === positionId);
    const shiftIds = new Set(positionShifts.map(s => s.id));
    return currentResult.assignments.filter(a => shiftIds.has(a.shiftId)).length;
  };

  const getTotalRequired = (positionId: string) => {
    return shifts
      .filter(s => s.positionId === positionId)
      .reduce((sum, s) => sum + s.requiredCount, 0);
  };

  const hasVacancy = (positionId: string) => {
    if (!currentResult) return false;
    return currentResult.anomalies.some(
      a => a.type === 'vacancy' && shifts.find(s => s.id === a.shiftId)?.positionId === positionId
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300">
        <Briefcase className="h-4 w-4 text-brand-500" />
        岗位情况
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-left text-xs text-gray-500">
              <th className="pb-2 pr-3 font-medium">岗位</th>
              <th className="pb-2 pr-3 font-medium">所需技能</th>
              <th className="pb-2 pr-3 font-medium text-center">编制</th>
              <th className="pb-2 font-medium">填充率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {positions.map(pos => {
              const assigned = getAssignedCount(pos.id);
              const total = getTotalRequired(pos.id);
              const rate = total > 0 ? assigned / total : 0;
              const vacant = hasVacancy(pos.id);

              return (
                <tr
                  key={pos.id}
                  className={cn('transition-colors', vacant && 'bg-rose-500/5')}
                >
                  <td className={cn('py-2.5 pr-3 font-medium', vacant ? 'text-rose-400' : 'text-gray-200')}>
                    {pos.name}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {pos.requiredSkillIds.map(sid => {
                        const skill = getSkillById(sid);
                        if (!skill) return null;
                        return (
                          <span
                            key={sid}
                            className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[skill.category])}
                          >
                            {skill.name}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-center font-mono text-gray-400">
                    {currentResult ? `${assigned}/${total}` : `${pos.headcount}`}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-700">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            rate >= 1 ? 'bg-brand-500' : rate >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                          )}
                          style={{ width: `${Math.min(rate * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-gray-500">
                        {currentResult ? `${Math.round(rate * 100)}%` : '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
