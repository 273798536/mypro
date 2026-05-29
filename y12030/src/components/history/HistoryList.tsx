import { useVestingStore } from '../../store/useVestingStore';
import { formatDateTime, formatDate } from '../../utils/format';
import { History, User, FileEdit } from 'lucide-react';
import type { CorrectionHistory } from '../../../shared/types';

export function HistoryList() {
  const { history, historyLoading } = useVestingStore();

  if (historyLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="card p-6">
      <div className="space-y-6">
        {sortedHistory.map((record) => (
          <HistoryItem key={record.id} record={record} />
        ))}
        {sortedHistory.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <History size={48} className="mx-auto mb-3 opacity-30" />
            <p>暂无修正历史</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryItem({
  record,
}: {
  record: CorrectionHistory & { employeeName?: string; employeeNo?: string };
}) {
  const getFieldLabel = (field: string) => {
    const map: Record<string, string> = {
      totalShares: '授予数量',
      agreementVersion: '协议版本',
      grantDate: '授予日期',
    };
    return map[field] || field;
  };

  return (
    <div className="timeline-item">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileEdit className="text-primary-600" size={20} />
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                修正{getFieldLabel(record.fieldName)}
              </div>
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <User size={14} />
                {record.operator}
                <span className="text-slate-300">·</span>
                {record.employeeName && (
                  <>
                    <span className="text-primary-600 font-medium">
                      {record.employeeName}
                    </span>
                    <span className="font-mono text-xs">
                      ({record.employeeNo})
                    </span>
                    <span className="text-slate-300">·</span>
                  </>
                )}
                {formatDateTime(record.timestamp)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">原值</div>
              <span className="diff-old">{record.oldValue}</span>
            </div>
            <div className="text-slate-300 text-2xl">→</div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">新值</div>
              <span className="diff-new">{record.newValue}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-500 mb-1">修正原因</div>
            <p className="text-sm text-slate-700">{record.reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
