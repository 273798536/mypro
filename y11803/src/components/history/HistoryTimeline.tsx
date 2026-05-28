import { useState } from 'react';
import { History, Clock, User, ChevronDown, ChevronUp, GitCompare } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime, getActionLabel, getStatusLabel } from '@/utils/formatters';
import { CopyButton } from '@/components/common/CopyButton';
import type { HistoryRecord } from '@/types';

interface HistoryTimelineProps {
  refundOrderId?: string;
  limit?: number;
}

const actionColors: Record<string, string> = {
  create: 'bg-blue-500',
  status_update: 'bg-amber-500',
  amount_correction: 'bg-orange-500',
  note_add: 'bg-green-500',
  duplicate_mark: 'bg-red-500',
  cross_batch_freeze: 'bg-red-600',
  overdraft_warning: 'bg-red-500',
  unfreeze: 'bg-blue-600',
  export: 'bg-purple-500',
};

export function HistoryTimeline({ refundOrderId, limit }: HistoryTimelineProps) {
  const allRecords = useAppStore(state => state.historyRecords);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const records = refundOrderId
    ? allRecords.filter(r => r.refundOrderId === refundOrderId)
    : allRecords;

  const displayRecords = limit ? records.slice(0, limit) : records;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatValue = (value: any, key: string): string => {
    if (key === 'status' && typeof value === 'string') {
      return getStatusLabel(value);
    }
    if (typeof value === 'number') {
      return `¥${value.toFixed(2)}`;
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value ?? '-');
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <History size={18} className="text-amber-600" />
        <h3 className="font-mono font-bold text-slate-800">
          操作历史
          <span className="text-sm font-normal text-slate-500 ml-2">
            ({records.length} 条记录{limit && limit < records.length ? `，显示最近 ${limit} 条` : ''})
          </span>
        </h3>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {displayRecords.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 font-mono pl-10">
              暂无操作记录
            </p>
          ) : (
            displayRecords.map((record, index) => (
            <div key={record.id} className="relative pl-10">
              <div
                className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${actionColors[record.action] || 'bg-slate-500'}`}
              >
                <Clock size={14} className="text-white" />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-slate-800">
                    {getActionLabel(record.action)}
                  </span>
                  <span className="px-1.5 py-0.5 text-xs font-mono bg-slate-200 text-slate-600 rounded">
                    {record.action}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 font-mono mb-2">
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {record.operatorOriginalName}
                    <span className="text-amber-600 ml-0.5">*</span>
                  </span>
                  <span>{formatDateTime(record.timestamp)}</span>
                  <span className="text-slate-400">IP: {record.ip}</span>
                </div>
                <p className="text-sm text-slate-700 mb-2">
                  <span className="font-medium">原因：</span>
                  {record.reason}
                </p>

                {(Object.keys(record.oldValues).length > 0 || Object.keys(record.newValues).length > 0) && (
                  <div>
                    <button
                      onClick={() => toggleExpand(record.id)}
                      className="inline-flex items-center gap-1 text-xs font-mono text-amber-600 hover:text-amber-700 transition-colors"
                    >
                      <GitCompare size={12} />
                      查看变更对比
                      {expandedId === record.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {expandedId === record.id && (
                      <div className="mt-2 p-3 bg-white rounded border border-slate-200">
                      <table className="w-full text-sm font-mono">
                        <thead>
                          <tr className="border-b border-slate-200">
                          <th className="text-left py-1 text-slate-500 text-xs font-medium w-1/3">字段</th>
                          <th className="text-left py-1 text-slate-500 text-xs font-medium w-1/3">变更前</th>
                          <th className="text-left py-1 text-slate-500 text-xs font-medium w-1/3">变更后</th>
                        </tr>
                      </thead>
                        <tbody>
                          {Array.from(new Set([
                            ...Object.keys(record.oldValues),
                            ...Object.keys(record.newValues)
                          ]).map(key => (
                            <tr key={key} className="border-b border-slate-100 last:border-b-0">
                              <td className="py-1 text-slate-700 text-xs">{key}</td>
                              <td className="py-1">
                                <span className="text-red-600 bg-red-50 px-1 rounded">
                                  {formatValue(record.oldValues[key], key)}
                                </span>
                              </td>
                              <td className="py-1">
                                <span className="text-green-600 bg-green-50 px-1 rounded">
                                  {formatValue(record.newValues[key], key)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}
