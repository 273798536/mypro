import { useState } from 'react';
import { ChevronRight, User } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { TIME_SLOTS } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/components/FilterBar';

export function VolunteerPanel() {
  const { getFilteredVolunteers, getSkillById, getLeaveRecordsForVolunteer } = useStore();
  const volunteers = getFilteredVolunteers();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSlotLabel = (slotId: string) => TIME_SLOTS.find(t => t.id === slotId)?.label ?? slotId;

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300">
        <User className="h-4 w-4 text-brand-500" />
        志愿者列表
        <span className="font-mono text-xs text-gray-500">({volunteers.length})</span>
      </h3>

      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {volunteers.map(vol => {
          const isExpanded = expandedId === vol.id;
          const leaveRecords = getLeaveRecordsForVolunteer(vol.id);

          return (
            <div
              key={vol.id}
              className={cn(
                'cursor-pointer rounded-lg border border-surface-700 bg-surface-800 p-3 transition-colors hover:border-brand-500/40',
                isExpanded && 'border-brand-500/40'
              )}
              onClick={() => setExpandedId(isExpanded ? null : vol.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronRight className={cn('h-3.5 w-3.5 text-gray-500 transition-transform', isExpanded && 'rotate-90')} />
                  <span className="text-sm font-medium text-gray-200">{vol.name}</span>
                </div>
                {vol.leaveSlots.length > 0 && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    {vol.leaveSlots.length} 假
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1 pl-5.5">
                {vol.skillIds.map(sid => {
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

              {isExpanded && (
                <div className="mt-3 space-y-1.5 border-t border-surface-700 pt-2 pl-5.5">
                  {leaveRecords.length === 0 ? (
                    <p className="text-xs text-gray-500">无请假记录</p>
                  ) : (
                    leaveRecords.map(lr => (
                      <div key={lr.id} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-amber-400">{getSlotLabel(lr.timeSlot)}</span>
                        <span className="text-gray-400">{lr.reason}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
