import { cn } from '@/lib/utils';
import type { AuditLog, ExportBatch } from '@/types';
import { formatDateTime } from '@/data/mockData';
import { History, FileDown, Upload, Search, MessageSquare, Shield, RotateCcw } from 'lucide-react';

interface AuditLogTimelineProps {
  logs: AuditLog[];
  exportBatches: ExportBatch[];
}

const actionIcons: Record<string, typeof Upload> = {
  IMPORT: Upload,
  ANOMALY_DETECT: Search,
  BLOCK_MIGRATION: Shield,
  ADD_NOTE: MessageSquare,
  ADD_SLOW_QUERY_LOG: Search,
  EXPORT_REPORT: FileDown,
  RECALCULATE: RotateCcw,
};

const actionLabels: Record<string, string> = {
  IMPORT: '导入数据',
  ANOMALY_DETECT: '异常检测',
  BLOCK_MIGRATION: '拦截迁移',
  ADD_NOTE: '添加备注',
  ADD_SLOW_QUERY_LOG: '补录慢查询',
  EXPORT_REPORT: '导出报告',
  RECALCULATE: '重新计算',
};

const actionColors: Record<string, string> = {
  IMPORT: 'bg-blue-100 text-blue-600 border-blue-200',
  ANOMALY_DETECT: 'bg-purple-100 text-purple-600 border-purple-200',
  BLOCK_MIGRATION: 'bg-red-100 text-red-600 border-red-200',
  ADD_NOTE: 'bg-sky-100 text-sky-600 border-sky-200',
  ADD_SLOW_QUERY_LOG: 'bg-orange-100 text-orange-600 border-orange-200',
  EXPORT_REPORT: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  RECALCULATE: 'bg-amber-100 text-amber-600 border-amber-200',
};

export function AuditLogTimeline({ logs, exportBatches }: AuditLogTimelineProps) {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <History className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">审计日志</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              所有操作记录，用于审计追溯
            </p>
          </div>
        </div>
        {exportBatches.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">已导出报告</p>
            <p className="text-sm font-mono font-medium text-slate-700">
              {exportBatches.length} 次
            </p>
          </div>
        )}
      </div>

      {exportBatches.length > 0 && (
        <div className="p-4 border-b border-slate-200 bg-emerald-50/30">
          <h4 className="text-xs font-medium text-slate-600 mb-2">导出批次历史</h4>
          <div className="flex flex-wrap gap-2">
            {exportBatches.map((batch) => (
              <div
                key={batch.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-200 rounded-md"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono text-xs text-slate-700">{batch.batchNumber}</span>
                <span className="text-xs text-slate-500">
                  {formatDateTime(batch.exportTime)}
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                  {batch.format.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="relative">
          <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {sortedLogs.map((log) => {
              const Icon = actionIcons[log.action] || Search;
              const colorClass = actionColors[log.action] || 'bg-slate-100 text-slate-600 border-slate-200';
              const label = actionLabels[log.action] || log.action;

              return (
                <div key={log.id} className="relative flex gap-4">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white',
                      colorClass
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{label}</span>
                          <span className="text-xs text-slate-500">
                            操作人：{log.operator}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{log.detail}</p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
