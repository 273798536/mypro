import { Clock, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { TIME_SLOTS } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function LeaveTimeline() {
  const { leaveRecords, getVolunteerById, volunteers, shifts, currentResult } = useStore();

  const getSlotLabel = (slotId: string) => TIME_SLOTS.find(t => t.id === slotId)?.label ?? slotId;

  const isConflictSlot = (timeSlot: string) => {
    if (!currentResult) return false;
    return currentResult.anomalies.some(a => {
      if (a.type === 'leave_conflict' && a.shiftId) {
        const shift = shifts.find(s => s.id === a.shiftId);
        return shift?.timeSlot === timeSlot;
      }
      return false;
    });
  };

  const isLeaveConflict = (recordId: string) => {
    if (!currentResult) return false;
    const record = leaveRecords.find(r => r.id === recordId);
    if (!record) return false;
    return currentResult.anomalies.some(a => {
      if (a.type !== 'leave_conflict') return false;
      const vol = getVolunteerById(a.volunteerId ?? '');
      return vol?.id === record.volunteerId && isConflictSlot(record.timeSlot);
    });
  };

  const sortedRecords = [...leaveRecords].sort((a, b) => {
    const idx = (id: string) => TIME_SLOTS.findIndex(t => t.id === id);
    return idx(a.timeSlot) - idx(b.timeSlot);
  });

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300">
        <Clock className="h-4 w-4 text-brand-500" />
        请假时间线
      </h3>

      <div className="space-y-2">
        {sortedRecords.map(record => {
          const volunteer = getVolunteerById(record.volunteerId);
          const conflict = isLeaveConflict(record.id);

          return (
            <div
              key={record.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2',
                conflict && 'border-amber-500/40 bg-amber-500/5'
              )}
            >
              <div className={cn('h-2 w-2 rounded-full', conflict ? 'bg-amber-500' : 'bg-gray-500')} />
              <span className="text-sm font-medium text-gray-200">{volunteer?.name ?? '未知'}</span>
              <span className="font-mono text-xs text-gray-500">{getSlotLabel(record.timeSlot)}</span>
              <span className="text-xs text-gray-500">{record.reason}</span>
              {conflict && (
                <span className="ml-auto flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  冲突
                </span>
              )}
            </div>
          );
        })}

        {leaveRecords.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-500">暂无请假记录</p>
        )}
      </div>
    </div>
  );
}
