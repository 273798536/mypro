import { History } from 'lucide-react';
import type { AuditHistory } from 'shared/types';

interface AuditHistoryListProps {
  history: AuditHistory[];
  isLoading?: boolean;
}

export function AuditHistoryList({ history, isLoading }: AuditHistoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-slate-300 border-t-blue-900 rounded-full" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <History className="h-12 w-12 mx-auto mb-2 text-slate-300" />
        <p>暂无变更记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {history.map((record) => (
        <div
          key={record.id}
          className="bg-slate-50 rounded-lg p-3 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-800">{record.fieldName}</span>
            <span className="text-xs text-slate-500">
              {new Date(record.changedAt).toLocaleString('zh-CN')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono text-xs">
              {record.oldValue || '-'}
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-xs">
              {record.newValue || '-'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>操作人：{record.changedBy}</span>
            {record.changeReason && <span>原因：{record.changeReason}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
