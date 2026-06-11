import { useState, useMemo } from 'react';
import { Download, AlertTriangle, Info } from 'lucide-react';
import { useScheduleStore } from '@/store';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CONFLICT_TYPE_LABELS, CONFLICT_TYPE_COLORS, ConflictType } from '@/types';
import { generateConflictExplanation } from '@/utils/conflictDetector';
import { exportReport, downloadBlob } from '@/utils/exporter';

export default function Analysis() {
  const scheduleEntries = useScheduleStore((state) => state.scheduleEntries);
  const volunteers = useScheduleStore((state) => state.volunteers);
  const positions = useScheduleStore((state) => state.positions);

  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);

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

  const pieData = Object.entries(stats.conflictByType)
    .filter(([, count]) => (count as number) > 0)
    .map(([type, count]) => ({
      name: CONFLICT_TYPE_LABELS[type as ConflictType],
      value: count as number,
      color: CONFLICT_TYPE_COLORS[type as ConflictType]
    }));

  const stageData = [
    { name: '主舞台', 冲突: 2, 已解决: 5 },
    { name: '电音舞台', 冲突: 1, 已解决: 3 },
    { name: '民谣舞台', 冲突: 0, 已解决: 2 },
    { name: '嘻哈舞台', 冲突: 1, 已解决: 4 }
  ];

  const handleExportReport = () => {
    const blob = exportReport(allConflicts, stats);
    downloadBlob(blob, `冲突检测报告_${new Date().toLocaleDateString('zh-CN')}.txt`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">异常复盘</h1>
          <p className="text-sm text-slate-500 mt-1">统计分析冲突数据，优化排班质量</p>
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          <Download className="w-4 h-4" />
          导出检测报告
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">冲突类型分布</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                暂无冲突数据
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">各舞台冲突情况</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stageData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="冲突" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="已解决" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-4">检测口径说明</h3>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <p className="text-sm font-medium text-amber-800">餐休冲突</p>
              <p className="text-xs text-amber-600 mt-1">排班时段与志愿者预设餐休时间重叠</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-sm font-medium text-red-800">证件缺失</p>
              <p className="text-xs text-red-600 mt-1">志愿者未领取工作证件</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <p className="text-sm font-medium text-orange-800">岗位缺人</p>
              <p className="text-xs text-orange-600 mt-1">岗位实际分配人数少于需求人数</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <p className="text-sm font-medium text-purple-800">技能不匹配</p>
              <p className="text-xs text-purple-600 mt-1">志愿者缺少岗位要求的技能</p>
            </div>
            <div className="p-3 bg-pink-50 rounded-xl">
              <p className="text-sm font-medium text-pink-800">时段重叠</p>
              <p className="text-xs text-pink-600 mt-1">同一志愿者在同一时段被分配到多个岗位</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-slate-800">冲突详情列表</h3>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
              {allConflicts.length} 项
            </span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {allConflicts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">暂无冲突</p>
              <p className="text-sm text-slate-400 mt-1">所有排班状态良好</p>
            </div>
          ) : (
            allConflicts.map((conflict) => {
              const entry = scheduleEntries.find(e => e.conflicts.some(c => c.id === conflict.id));
              const volunteer = volunteers.find(v => v.id === entry?.volunteerId);
              const isExpanded = expandedConflict === conflict.id;

              return (
                <div key={conflict.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div
                    className="flex items-start gap-4 cursor-pointer"
                    onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
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
                        <span className="px-2 py-0.5 text-xs font-medium rounded" style={{
                          backgroundColor: `${CONFLICT_TYPE_COLORS[conflict.type]}15`,
                          color: CONFLICT_TYPE_COLORS[conflict.type]
                        }}>
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
                        {volunteer && (
                          <span className="text-sm text-slate-600">
                            涉及志愿者: <span className="font-medium">{volunteer.name}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{conflict.message}</p>
                    </div>
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>
                  {isExpanded && (
                    <div className="mt-4 ml-14 p-4 bg-slate-100 rounded-xl">
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans">
                        {generateConflictExplanation(conflict)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
