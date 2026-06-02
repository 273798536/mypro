import { Download, FileJson, FileSpreadsheet, AlertCircle, Search, Upload, Edit3, Database } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { TIME_SLOTS } from '@/data/mockData';
import type { DataSource } from '@/types';

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

function getSourceLabel(source: DataSource | undefined): string {
  if (!source) return '未知';
  switch (source.type) {
    case 'import':
      return `导入：${source.filename} 第${source.rowIndex}行`;
    case 'manual':
      return `手动：${source.manualEditTimestamp?.slice(0, 16) || ''}`;
    case 'system':
      return '系统样例';
    default:
      return '未知';
  }
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
    
    const positions: string[] = [];
    const shiftRecords: Array<{
      shiftDetail: string;
      hasAnomaly: boolean;
      anomalyType: string;
      anomalyDetail: string;
    }> = [];
    const allAnomalyTypes: string[] = [];

    for (const a of volAssignments) {
      const sh = getShiftById(a.shiftId);
      const pos = sh ? getPositionById(sh.positionId) : undefined;
      const ts = TIME_SLOTS.find(t => t.id === sh?.timeSlot);
      const posName = pos?.name ?? '未知岗位';
      const tsLabel = ts?.label ?? sh?.timeSlot ?? '未知时段';
      const shiftDetail = `${posName}（${tsLabel}）`;
      
      if (pos && !positions.includes(posName)) {
        positions.push(posName);
      }
      
      shiftRecords.push({
        shiftDetail,
        hasAnomaly: !!a.isAnomaly,
        anomalyType: a.anomalyType ?? '',
        anomalyDetail: a.isAnomaly ? `[${tsLabel}] ${a.constraintExplanation || a.anomalyType}` : '',
      });
      
      if (a.isAnomaly && a.anomalyType && !allAnomalyTypes.includes(a.anomalyType)) {
        allAnomalyTypes.push(a.anomalyType);
      }
    }

    return {
      volunteerName: v.name,
      skills: skillNames || '无',
      positions: positions.length > 0 ? positions : ['未分配'],
      shiftCount: volAssignments.length,
      shiftRecords,
      anomalyTypes: allAnomalyTypes.length > 0 ? allAnomalyTypes : [],
      anomalyCount: shiftRecords.filter(s => s.hasAnomaly).length,
      sourceType: v.source?.type === 'import' ? '导入' : v.source?.type === 'manual' ? '手动' : v.source?.type === 'system' ? '系统' : '未知',
      sourceDetail: getSourceLabel(v.source),
    };
  });

  const traceTableRows = traceData.flatMap(t => 
    t.shiftRecords.map((sr, idx) => ({
      volunteerName: idx === 0 ? t.volunteerName : '',
      skills: idx === 0 ? t.skills : '',
      shiftDetail: sr.shiftDetail,
      hasAnomaly: sr.hasAnomaly,
      anomalyType: sr.anomalyType,
      anomalyDetail: sr.anomalyDetail,
      sourceType: idx === 0 ? t.sourceType : '',
      sourceDetail: idx === 0 ? t.sourceDetail : '',
    }))
  );

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
      ['志愿者', '技能标签', '分配班次', '异常类型', '异常说明', '来源类型', '来源详情'],
      traceTableRows.map(r => [r.volunteerName, r.skills, r.shiftDetail, r.anomalyType, r.anomalyDetail, r.sourceType, r.sourceDetail]),
    );
  };

  const handleExportTraceJSON = () => {
    exportJSON(traceData.map(t => ({
      志愿者: t.volunteerName,
      技能标签: t.skills,
      分配岗位: t.positions,
      班次数: t.shiftCount,
      分配班次详情: t.shiftRecords.map(sr => ({
        班次: sr.shiftDetail,
        是否异常: sr.hasAnomaly,
        异常类型: sr.anomalyType,
        异常说明: sr.anomalyDetail,
      })),
      异常类型汇总: t.anomalyTypes,
      异常总数: t.anomalyCount,
      来源类型: t.sourceType,
      来源详情: t.sourceDetail,
    })), 'trace_report.json');
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
                <tr className="border-b border-surface-700 text-gray-400 bg-surface-800/80 sticky top-0">
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
          <span className="text-xs text-gray-500">同一志愿者多班次、多异常完整对应</span>
        </div>

        <div className="rounded-xl bg-surface-800 border border-surface-700 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-700 text-gray-400 bg-surface-800/80 sticky top-0">
                  <th className="py-2 px-3 text-left font-medium w-20">志愿者</th>
                  <th className="py-2 px-3 text-left font-medium w-32">技能标签</th>
                  <th className="py-2 px-3 text-left font-medium w-36">分配班次</th>
                  <th className="py-2 px-3 text-left font-medium w-24">异常类型</th>
                  <th className="py-2 px-3 text-left font-medium">异常说明</th>
                  <th className="py-2 px-3 text-left font-medium w-14">来源</th>
                  <th className="py-2 px-3 text-left font-medium w-28">来源详情</th>
                </tr>
              </thead>
              <tbody>
                {traceTableRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-surface-700/50 ${row.hasAnomaly ? 'bg-warn/5' : ''}`}
                  >
                    <td className="py-1.5 px-3 font-mono">{row.volunteerName}</td>
                    <td className="py-1.5 px-3">{row.skills}</td>
                    <td className="py-1.5 px-3">{row.shiftDetail}</td>
                    <td className="py-1.5 px-3">
                      {row.anomalyType ? (
                        <span className="text-warn">{row.anomalyType}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-gray-500">{row.anomalyDetail || '—'}</td>
                    <td className="py-1.5 px-3">
                      {row.sourceType && (
                        <span className={`inline-flex items-center gap-1 ${
                          row.sourceType === '导入' ? 'text-brand-400' :
                          row.sourceType === '手动' ? 'text-amber-400' :
                          'text-gray-500'
                        }`}>
                          {row.sourceType === '导入' && <Upload size={10} />}
                          {row.sourceType === '手动' && <Edit3 size={10} />}
                          {row.sourceType === '系统' && <Database size={10} />}
                          {row.sourceType}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-gray-600 text-[10px]">{row.sourceDetail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex gap-3">
            <button
              onClick={handleExportTraceCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
            >
              <Download size={14} />
              导出 CSV
            </button>
            <button
              onClick={handleExportTraceJSON}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm font-medium border border-surface-600 transition-colors"
            >
              <FileJson size={14} />
              导出 JSON
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>志愿者: {traceData.length} 人</span>
            <span>班次: {traceData.reduce((s, t) => s + t.shiftCount, 0)} 次</span>
            <span>异常: {traceData.reduce((s, t) => s + t.anomalyCount, 0)} 处</span>
          </div>
        </div>
      </div>
    </div>
  );
}
