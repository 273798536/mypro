import { useMemo } from 'react';
import { Users, CalendarCheck, AlertTriangle, CheckCircle2, Clock, Database, Download, Wand2 } from 'lucide-react';
import { useScheduleStore } from '@/store';
import StatCard from '@/components/ui/StatCard';
import { CONFLICT_TYPE_LABELS, ConflictType } from '@/types';
import { exportToCSV, downloadBlob } from '@/utils/exporter';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const scheduleEntries = useScheduleStore((state) => state.scheduleEntries);
  const volunteers = useScheduleStore((state) => state.volunteers);
  const positions = useScheduleStore((state) => state.positions);
  const stages = useScheduleStore((state) => state.stages);
  const timeSlots = useScheduleStore((state) => state.timeSlots);
  const dataSources = useScheduleStore((state) => state.dataSources);
  const activeDate = useScheduleStore((state) => state.activeDate);
  const setActiveDate = useScheduleStore((state) => state.setActiveDate);
  const autoAssign = useScheduleStore((state) => state.autoAssign);

  const availableDates = [...new Set(timeSlots.map(t => t.date))].sort();

  const { stats, allConflicts } = useMemo(() => {
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
    const allConflictsList: typeof scheduleEntries[0]['conflicts'] = [];
    scheduleEntries.forEach((entry) => {
      entry.conflicts.forEach((c) => {
        conflictByType[c.type]++;
        totalConflicts++;
        allConflictsList.push(c);
      });
    });

    const positionsFilled = positions.filter((p) => {
      const count = scheduleEntries.filter((e) => e.positionId === p.id).length;
      return count >= p.headcount;
    }).length;

    return {
      stats: {
        totalVolunteers: volunteers.length,
        scheduledVolunteers: scheduledVolunteers.length,
        pendingVolunteers: pendingVolunteers.length,
        totalConflicts,
        conflictByType,
        positionsFilled,
        totalPositions: positions.length
      },
      allConflicts: allConflictsList
    };
  }, [scheduleEntries, volunteers, positions]);

  const handleAutoAssign = () => {
    autoAssign();
  };

  const handleExport = () => {
    const blob = exportToCSV(scheduleEntries, volunteers, positions, stages, timeSlots);
    downloadBlob(blob, `音乐节排班表_${activeDate}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">排班总览</h1>
          <p className="text-sm text-slate-500 mt-1">实时监控音乐节志愿者排班状态</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">活动日期:</span>
          <select
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {availableDates.map((date, idx) => (
              <option key={date} value={date}>
                {date} (第{idx + 1}天)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="志愿者总数"
          value={stats.totalVolunteers}
          subtitle="人"
          icon={Users}
          color="indigo"
          trend={5}
        />
        <StatCard
          title="已排班人数"
          value={stats.scheduledVolunteers}
          subtitle={`占比 ${((stats.scheduledVolunteers / stats.totalVolunteers) * 100).toFixed(0)}%`}
          icon={CalendarCheck}
          color="green"
          trend={12}
        />
        <StatCard
          title="待分配人数"
          value={stats.pendingVolunteers}
          subtitle="人"
          icon={Clock}
          color="orange"
          trend={-8}
        />
        <StatCard
          title="待处理冲突"
          value={stats.totalConflicts}
          subtitle="项"
          icon={AlertTriangle}
          color="red"
          trend={-15}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">异常告警</h2>
                <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">
                  {allConflicts.length} 项待处理
                </span>
              </div>
            </div>
            <div className="p-6">
              {allConflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-slate-500">暂无冲突，排班状态良好</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allConflicts.slice(0, 5).map((conflict, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        conflict.severity === 'error' ? 'bg-red-100' : 'bg-orange-100'
                      )}>
                        <AlertTriangle className={cn(
                          'w-5 h-5',
                          conflict.severity === 'error' ? 'text-red-600' : 'text-orange-600'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            {CONFLICT_TYPE_LABELS[conflict.type]}
                          </span>
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded',
                            conflict.severity === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                          )}>
                            {conflict.severity === 'error' ? '严重' : '警告'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 truncate">
                          {conflict.message}
                        </p>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                        查看详情
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">冲突类型分布</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(stats.conflictByType).map(([type, count]) => (
                  <div key={type} className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-800">{count as number}</p>
                    <p className="text-xs text-slate-500 mt-1">{CONFLICT_TYPE_LABELS[type as ConflictType]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-slate-800">数据来源</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {dataSources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{source.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{source.source}</p>
                    </div>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                      v{source.version}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-400">
                      {new Date(source.timestamp).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="text-xs text-slate-500">
                      {source.recordCount} 条记录
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-lg">快速操作</h3>
            <p className="text-white/70 text-sm mt-1">一键完成排班和导出</p>
            <div className="mt-6 space-y-3">
              <button
                onClick={handleAutoAssign}
                className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                自动智能排班
              </button>
              <button
                onClick={handleExport}
                className="w-full py-3 bg-white text-indigo-600 hover:bg-white/90 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出排班表
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
