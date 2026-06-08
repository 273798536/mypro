import { ChevronRight, AlertTriangle, Check, GitMerge, Plus } from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import {
  ANOMALY_LABELS,
  ANOMALY_COLORS,
  SEVERITY_DOT,
  STATUS_LABELS,
  type ProjectionRecord,
} from '@/types';

const STATUS_ICONS = {
  new: Plus,
  merged: GitMerge,
  supplemented: GitMerge,
  resolved: Check,
};

const STATUS_COLORS: Record<ProjectionRecord['status'], string> = {
  new: 'text-cyan-400',
  merged: 'text-amber-400',
  supplemented: 'text-amber-400',
  resolved: 'text-lime-400',
};

export default function AnomalyTable() {
  const getFilteredRecords = useProjectionStore((s) => s.getFilteredRecords);
  const selectedId = useProjectionStore((s) => s.selectedRecordId);
  const selectRecord = useProjectionStore((s) => s.selectRecord);
  const focusSection = useProjectionStore((s) => s.focusSection);

  const records = getFilteredRecords();

  if (records.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <div className="text-sm">没有匹配的记录</div>
          <div className="text-xs mt-1 text-zinc-600">调整筛选条件或导入新数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-panel-surface">
          <tr className="text-left border-b border-panel-border">
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-10"></th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-16">行号</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-44">图片名</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-32">异常类型</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-20">级别</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-24">状态</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">处理意见</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-44">来源备注</th>
            <th className="px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider w-10"></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => {
            const active = selectedId === r.id;
            const StatusIcon = STATUS_ICONS[r.status];
            const isZebra = idx % 2 === 1;
            const flash = active && focusSection;
            return (
              <tr
                key={r.id}
                onClick={() => selectRecord(r.id)}
                className={`cursor-pointer transition-colors border-b border-panel-border/60 ${
                  active
                    ? 'bg-amber-500/5 border-l-2 border-l-amber-500'
                    : isZebra
                      ? 'bg-panel-bg/60 hover:bg-panel-hover'
                      : 'hover:bg-panel-hover'
                } ${flash ? 'animate-border-flash' : ''}`}
              >
                <td className="px-3 py-2.5 align-middle">
                  <span className={`w-2 h-2 inline-block ${SEVERITY_DOT[r.severity]}`} />
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <span className="data-mono text-zinc-300">{r.originalRowNumber}</span>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <div className="data-mono text-zinc-200 truncate max-w-[170px]">{r.imageName}</div>
                  <div className="text-[11px] text-zinc-500 truncate max-w-[170px]">{r.projectName}</div>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <span className={`chip ${ANOMALY_COLORS[r.anomalyType]}`}>
                    {r.anomalyType === 'camera_view_lost' && <AlertTriangle className="w-3 h-3" />}
                    {ANOMALY_LABELS[r.anomalyType]}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-middle text-zinc-400 text-xs capitalize">{r.severity}</td>
                <td className="px-3 py-2.5 align-middle">
                  <span className={`inline-flex items-center gap-1 text-xs ${STATUS_COLORS[r.status]}`}>
                    <StatusIcon className="w-3 h-3" />
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-middle text-zinc-400 text-xs max-w-md">
                  <div className="truncate">{r.suggestion || '—'}</div>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <div className="text-xs text-zinc-500 font-mono truncate max-w-[170px]">{r.sourceNote || '—'}</div>
                  <div className="text-[10px] text-zinc-600 font-mono">{r.importBatchId}</div>
                </td>
                <td className="px-2 py-2.5 align-middle">
                  <ChevronRight className={`w-4 h-4 ${active ? 'text-amber-500' : 'text-zinc-600'}`} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
