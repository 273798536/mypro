import { useMemo } from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useScheduleStore } from '@/store';

export default function Header() {
  const scheduleEntries = useScheduleStore((state) => state.scheduleEntries);
  const volunteers = useScheduleStore((state) => state.volunteers);
  const positions = useScheduleStore((state) => state.positions);
  
  const stats = useMemo(() => {
    const scheduledIds = new Set(scheduleEntries.map((e) => e.volunteerId));
    const scheduledVolunteers = volunteers.filter((v) => scheduledIds.has(v.id));
    const pendingVolunteers = volunteers.filter((v) => !scheduledIds.has(v.id));

    const conflictByType = {
      mealBreak: 0,
      credential: 0,
      headcount: 0,
      skill: 0,
      overlap: 0
    };

    let totalConflicts = 0;
    scheduleEntries.forEach((entry) => {
      entry.conflicts.forEach((c) => {
        conflictByType[c.type]++;
        totalConflicts++;
      });
    });

    const positionsFilled = positions.filter((p) => {
      const count = scheduleEntries.filter((e) => e.positionId === p.id).length;
      return count >= p.headcount;
    }).length;

    return {
      totalVolunteers: volunteers.length,
      scheduledVolunteers: scheduledVolunteers.length,
      pendingVolunteers: pendingVolunteers.length,
      totalConflicts,
      conflictByType,
      positionsFilled,
      totalPositions: positions.length
    };
  }, [scheduleEntries, volunteers, positions]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索志愿者、岗位..."
            className="pl-10 pr-4 py-2 w-80 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          {stats.totalConflicts} 项待处理冲突
        </div>

        <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          {stats.totalConflicts > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {stats.totalConflicts}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">活动统筹</p>
            <p className="text-xs text-slate-500">管理员</p>
          </div>
        </div>
      </div>
    </header>
  );
}
