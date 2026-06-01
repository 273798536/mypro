import { Download, FileJson, FileSpreadsheet, AlertCircle, Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { TIME_SLOTS } from '@/data/mockData';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV(headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  downloadFile(csvContent, 'schedule.csv', 'text/csv;charset=utf-8');
}

function exportJSON(data: unknown, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

export default function Export() {
  const currentResult = useStore(s => s.currentResult);
  const getVolunteerById = useStore(s => s.getVolunteerById);
  const getPositionById = useStore(s => s.getPositionById);
  const getShiftById = useStore(s => s.getShiftById);
  const getSkillById = useStore(s => s.getSkillById);
  const volunteers = useStore(s => s.volunteers);

  if (!currentResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="rounded-xl bg-surface-800 border border-surface-700 p-8 text-center max-w-md">
          <AlertCircle size={40} className="text-warn mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-200 mb-2">尚未运行排班算法</h2>
          <p className="text-sm text-gray-500">请先运行排班算法后再导出</p>
        </div>
      </div>
    );
  }

  const scheduleRows = currentResult.assignments.map(a => {
    const vol = getVolunteerById(a.volunteerId);
    const shift = getShiftById(a.shiftId);
    const pos = shift ? getPositionById(shift.positionId) : undefined;
    const ts = TIME_SLOTS.find(t => t.id === shift?.timeSlot);
    return {
      volunteerName: vol?.name ?? '—',
      positionName: pos?.name ?? '—',
      timeSlotLabel: ts?.label ?? shift?.timeSlot ?? '—',
      status: a.isAnomaly ? '异常' : '正常',
      anomalyNote: a.isAnomaly
        ? a.constraintExplanation || a.anomalyType || '异常'
        : '',
      volunteerId: a.volunteerId,
      isAnomaly: a.isAnomaly,
      anomalyType: a.anomalyType,
    };
  });

  const traceData = volunteers.map(v => {
    const volAssignments = currentResult.assignments.filter(a => a.volunteerId === v.id);
    const skillNames = v.skillIds.map(sid => getSkillById(sid)?.name ?? sid).join('、');
    const anomalyAssignment = volAssignments.find(a => a.isAnomaly);
    const posName = anomalyAssignment
      ? (() => {
          const sh = getShiftById(anomalyAssignment.shiftId);
          return sh ? getPositionById(sh.positionId)?.name ?? '—' : '—';
        })()
      : volAssignments.length > 0
        ? (() => {
            const sh = getShiftById(volAssignments[0].shiftId);
            return sh ? getPositionById(sh.positionId)?.name ?? '—' : '—';
          })()
        : '未分配';

    return {
      volunteerName: v.name,
      skills: skillNames || '无',
      position: posName,
      anomalyType: anomalyAssignment?.anomalyType ?? '',
      anomalyDesc: anomalyAssignment?.constraintExplanation ?? '',
    };
  });

  const handleExportScheduleCSV = () => {
    exportCSV(
      ['志愿者', '岗位', '时段', '状态', '异常说明'],
      scheduleRows.map(r => [r.volunteerName, r.positionName, r.timeSlotLabel, r.status, r.anomalyNote]),
    );
  };

  const handleExportScheduleJSON = () => {
    exportJSON(scheduleRows.map(r => ({
      志愿者: r.volunteerName,
      岗位: r.positionName,
      时段: r.timeSlotLabel,
      状态: r.status,
      异常说明: r.anomalyNote,
    })), 'schedule.json');
  };

  const handleExportTraceCSV = () => {
    exportCSV(
      ['志愿者', '技能标签', '分配岗位', '异常类型', '异常说明'],
      traceData.map(r => [r.volunteerName, r.skills, r.position, r.anomalyType, r.anomalyDesc]),
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet size={18} className="text-brand-400" />
          <h2 className="text-base font-semibold text-gray-200">排班表导出</h2>
        </div>

        <div className="rounded-xl bg-surface-800 border border-surface-700 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-700 text-gray-400 bg-surface-800/80">
                  <th className="py-2 px-3 text-left font-medium">志愿者</th>
                  <th className="py-2 px-3 text-left font-medium">岗位</th>
                  <th className="py-2 px-3 text-left font-medium">时段</th>
                  <th className="py-2 px-3 text-left font-medium">状态</th>
                  <th className="py-2 px-3 text-left font-medium">异常说明</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-surface-700/50 ${row.isAnomaly ? 'bg-danger/5' : ''}`}
                  >
                    <td className="py-1.5 px-3 font-mono">{row.volunteerName}</td>
                    <td className="py-1.5 px-3">{row.positionName}</td>
                    <td className="py-1.5 px-3">{row.timeSlotLabel}</td>
                    <td className="py-1.5 px-3">
                      {row.isAnomaly ? (
                        <span className="text-danger">{row.status}</span>
                      ) : (
                        <span className="text-brand-400">{row.status}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-gray-500">{row.anomalyNote || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleExportScheduleCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
          >
            <Download size={14} />
            导出 CSV
          </button>
          <button
            onClick={handleExportScheduleJSON}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm font-medium border border-surface-600 transition-colors"
          >
            <FileJson size={14} />
            导出 JSON
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} className="text-brand-400" />
          <h2 className="text-base font-semibold text-gray-200">来源追溯报告</h2>
        </div>

        <div className="rounded-xl bg-surface-800 border border-surface-700 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-700 text-gray-400 bg-surface-800/80">
                  <th className="py-2 px-3 text-left font-medium">志愿者</th>
                  <th className="py-2 px-3 text-left font-medium">技能标签</th>
                  <th className="py-2 px-3 text-left font-medium">分配岗位</th>
                  <th className="py-2 px-3 text-left font-medium">异常类型</th>
                  <th className="py-2 px-3 text-left font-medium">异常说明</th>
                </tr>
              </thead>
              <tbody>
                {traceData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-surface-700/50 ${row.anomalyType ? 'bg-warn/5' : ''}`}
                  >
                    <td className="py-1.5 px-3 font-mono">{row.volunteerName}</td>
                    <td className="py-1.5 px-3">{row.skills}</td>
                    <td className="py-1.5 px-3">{row.position}</td>
                    <td className="py-1.5 px-3">
                      {row.anomalyType ? (
                        <span className="text-warn">{row.anomalyType}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-gray-500">{row.anomalyDesc || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleExportTraceCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
          >
            <Download size={14} />
            导出 CSV
          </button>
        </div>
      </div>
    </div>
  );
}
