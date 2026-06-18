import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ArchiveRecord } from '@/types';
import { StatusBadge, AnomalyBadge } from './StatusBadge';
import { formatDateTime, formatNumber, getMissingCount } from '@/data/mockData';
import { ChevronRight, AlertCircle, Clock } from 'lucide-react';

interface ArchiveTableProps {
  records: ArchiveRecord[];
}

export function ArchiveTable({ records }: ArchiveTableProps) {
  const navigate = useNavigate();

  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <div className="text-slate-400 mb-2">
          <Clock className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-slate-500">暂无归档记录</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">
                表名
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">
                运行批次
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">
                异常类型
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 text-xs uppercase tracking-wider">
                预期/实际
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 text-xs uppercase tracking-wider">
                缺失
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">
                运行时间
              </th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 text-xs uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => {
              const missing = getMissingCount(record);
              const hasIssue = record.status !== 'success';

              return (
                <tr
                  key={record.id}
                  className={cn(
                    'hover:bg-slate-50 transition-colors cursor-pointer',
                    hasIssue && 'bg-slate-50/50'
                  )}
                  onClick={() => navigate(`/archive/${record.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {hasIssue && (
                        <AlertCircle
                          className={cn(
                            'w-4 h-4 flex-shrink-0',
                            record.status === 'error' && 'text-red-500',
                            record.status === 'pending' && 'text-amber-500'
                          )}
                        />
                      )}
                      <span className="font-mono text-slate-800">{record.tableName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-600">{record.batchNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-4 py-3">
                    <AnomalyBadge type={record.anomalyType} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    <div>{formatNumber(record.expectedCount)}</div>
                    <div className="text-xs text-slate-500">
                      / {formatNumber(record.actualCount)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {missing > 0 ? (
                      <span className="font-mono text-red-600 font-medium">
                        -{formatNumber(missing)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(record.runTimestamp)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/archive/${record.id}`);
                      }}
                    >
                      详情
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
