import { useMemo, useState } from 'react';
import { Download, Wand2, AlertTriangle, X, Users, ShieldAlert } from 'lucide-react';
import { useScheduleStore } from '@/store';
import { CONFLICT_TYPE_LABELS } from '@/types';
import { exportToCSV, downloadBlob } from '@/utils/exporter';

export default function Schedule() {
  const stages = useScheduleStore((state) => state.stages);
  const timeSlots = useScheduleStore((state) => state.timeSlots);
  const positions = useScheduleStore((state) => state.positions);
  const volunteers = useScheduleStore((state) => state.volunteers);
  const scheduleEntries = useScheduleStore((state) => state.scheduleEntries);
  const activeDate = useScheduleStore((state) => state.activeDate);
  const addScheduleEntry = useScheduleStore((state) => state.addScheduleEntry);
  const removeScheduleEntry = useScheduleStore((state) => state.removeScheduleEntry);
  const getUnscheduledVolunteers = useScheduleStore((state) => state.getUnscheduledVolunteers);
  const autoAssign = useScheduleStore((state) => state.autoAssign);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const unscheduledVolunteers = getUnscheduledVolunteers();

  const currentTimeSlots = timeSlots.filter((t) => t.date === activeDate);
  const uniqueSlots = [...new Set(currentTimeSlots.map((t) => t.label))] as string[];

  const { realEntries, headcountIssues } = useMemo(() => {
    const real = scheduleEntries.filter((e) => !e.id.startsWith('placeholder-'));
    const issues = new Map<
      string,
      {
        positionName: string;
        stageName: string;
        slotLabel: string;
        assigned: number;
        needed: number;
        shortage: number;
        message: string;
      }
    >();

    positions.forEach((pos) => {
      const assigned = real.filter((e) => e.positionId === pos.id).length;
      if (assigned < pos.headcount) {
        const slot = timeSlots.find((t) => t.id === pos.timeSlotId);
        const stage = stages.find((s) => s.id === pos.stageId);
        const shortage = pos.headcount - assigned;
        const key = `${pos.stageId}|${slot?.label || ''}`;
        if (!issues.has(key)) {
          issues.set(key, {
            positionName: pos.name,
            stageName: stage?.name || '',
            slotLabel: slot?.label || '',
            assigned,
            needed: pos.headcount,
            shortage,
            message: `${stage?.name || ''}${slot ? `·${slot.label}` : ''} 岗位「${pos.name}」缺 ${shortage} 人（${assigned}/${pos.headcount}）`
          });
        }
      }
    });

    return { realEntries: real, headcountIssues: issues };
  }, [scheduleEntries, positions, timeSlots, stages]);

  const getEntriesForCell = (stageId: string, slotLabel: unknown) => {
    const slot = currentTimeSlots.find((t) => t.stageId === stageId && t.label === slotLabel);
    if (!slot) return [];
    return realEntries.filter((e) => e.timeSlotId === slot.id && e.stageId === stageId);
  };

  const getPositionForSlot = (stageId: string, slotLabel: unknown) => {
    const slot = currentTimeSlots.find((t) => t.stageId === stageId && t.label === slotLabel);
    if (!slot) return null;
    return positions.find((p) => p.stageId === stageId && p.timeSlotId === slot.id);
  };

  const handleAssign = (volunteerId: string) => {
    if (!selectedSlot) return;
    const [stageId, slotLabel] = selectedSlot.split('|');
    const slot = currentTimeSlots.find((t) => t.stageId === stageId && t.label === slotLabel);
    const position = getPositionForSlot(stageId, slotLabel);
    if (slot && position) {
      addScheduleEntry(volunteerId, position.id, slot.id, stageId);
      setSelectedSlot(null);
    }
  };

  const handleAutoAssign = () => {
    setIsAutoAssigning(true);
    setTimeout(() => {
      autoAssign();
      setIsAutoAssigning(false);
    }, 400);
  };

  const handleExport = () => {
    const blob = exportToCSV(realEntries, volunteers, positions, stages, timeSlots);
    downloadBlob(blob, `音乐节排班表_${activeDate}.csv`);
  };

  const allHeadcountIssues = Array.from(headcountIssues.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">排班分配</h1>
          <p className="text-sm text-slate-500 mt-1">拖拽或点击分配志愿者到岗位</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出排班表
          </button>
          <button
            onClick={handleAutoAssign}
            disabled={isAutoAssigning}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Wand2 className={`w-4 h-4 ${isAutoAssigning ? 'animate-spin' : ''}`} />
            {isAutoAssigning ? '排班中...' : '智能排班'}
          </button>
        </div>
      </div>

      {allHeadcountIssues.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">
              岗位缺人告警 · 共 {allHeadcountIssues.reduce((s, i) => s + i.shortage, 0)} 个缺口
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {allHeadcountIssues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-white/70 border border-orange-100 rounded-xl"
              >
                <Users className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm text-orange-800 flex-1 truncate">
                  {issue.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-4 bg-slate-50 text-left text-xs font-medium text-slate-500 sticky left-0 z-10">
                      舞台 / 时段
                    </th>
                    {uniqueSlots.map((slot) => (
                      <th
                        key={slot}
                        className="px-4 py-4 bg-slate-50 text-center text-xs font-medium text-slate-500 min-w-32"
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stages.map((stage) => (
                    <tr key={stage.id}>
                      <td className="px-4 py-4 bg-slate-50 sticky left-0 z-10">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-medium text-slate-800">{stage.name}</span>
                        </div>
                      </td>
                      {uniqueSlots.map((slotLabel) => {
                        const entries = getEntriesForCell(stage.id, slotLabel);
                        const position = getPositionForSlot(stage.id, slotLabel);
                        const hasConflict = entries.some((e) => e.conflicts.length > 0);
                        const issue = headcountIssues.get(`${stage.id}|${slotLabel}`);
                        const isSelected = selectedSlot === `${stage.id}|${slotLabel}`;
                        const vacancy = position
                          ? Math.max(0, position.headcount - entries.length)
                          : 0;

                        return (
                          <td
                            key={slotLabel}
                            onClick={() => position && setSelectedSlot(`${stage.id}|${slotLabel}`)}
                            className={`px-2 py-3 cursor-pointer transition-colors align-top ${
                              isSelected
                                ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-inset'
                                : hasConflict || issue
                                  ? 'bg-red-50/30 hover:bg-red-50'
                                  : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-1 min-h-16">
                              {entries.map((entry) => {
                                const volunteer = volunteers.find(
                                  (v) => v.id === entry.volunteerId
                                );
                                return (
                                  <div
                                    key={entry.id}
                                    className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-100 group"
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                      style={{ backgroundColor: volunteer?.avatar }}
                                    >
                                      {volunteer?.name.charAt(0)}
                                    </div>
                                    <span className="text-xs text-slate-700 flex-1 truncate">
                                      {volunteer?.name}
                                    </span>
                                    {entry.conflicts.length > 0 && (
                                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeScheduleEntry(entry.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded transition-all"
                                    >
                                      <X className="w-3 h-3 text-red-500" />
                                    </button>
                                  </div>
                                );
                              })}
                              {position && vacancy > 0 && (
                                <div
                                  className={`text-xs text-center py-1 border-2 border-dashed rounded-lg ${
                                    issue
                                      ? 'border-orange-300 text-orange-600 bg-orange-50/50'
                                      : 'border-slate-200 text-slate-400'
                                  }`}
                                >
                                  + 空位 {entries.length}/{position.headcount}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="font-semibold text-slate-800 mb-3">待分配志愿者</h3>
            <p className="text-xs text-slate-500 mb-4">
              {unscheduledVolunteers.length} 人待分配 · 点击单元格后选择志愿者
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {unscheduledVolunteers.map((volunteer) => (
                <div
                  key={volunteer.id}
                  onClick={() => selectedSlot && handleAssign(volunteer.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedSlot
                      ? 'bg-indigo-50 cursor-pointer hover:bg-indigo-100'
                      : 'bg-slate-50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: volunteer.avatar }}
                  >
                    {volunteer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {volunteer.name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {volunteer.skills.slice(0, 2).map((skill) => (
                        <span key={skill} className="text-xs text-slate-500">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  {!volunteer.hasCredential && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                      无证件
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {realEntries.some((e) => e.conflicts.length > 0) && (
            <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
              <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                冲突提醒
              </h3>
              <div className="space-y-2">
                {realEntries
                  .filter((e) => e.conflicts.length > 0)
                  .slice(0, 3)
                  .map((entry) => {
                    const volunteer = volunteers.find((v) => v.id === entry.volunteerId);
                    return (
                      <div key={entry.id} className="text-xs text-orange-700">
                        <p className="font-medium">{volunteer?.name}</p>
                        {entry.conflicts.map((c) => (
                          <p key={c.id} className="text-orange-600">
                            · {CONFLICT_TYPE_LABELS[c.type]}: {c.message}
                          </p>
                        ))}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
