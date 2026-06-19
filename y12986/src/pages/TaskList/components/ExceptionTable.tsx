import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExceptionRecord } from '@/types';
import { Tag } from '@/components/ui/Tag';
import { StatusDot } from '@/components/ui/StatusDot';
import { Button } from '@/components/ui/Button';
import { Eye, ArrowRightCircle } from 'lucide-react';
import {
  formatDateTime,
  getExceptionTypeLabel,
  getExceptionTypeColor,
  getSeverityLabel,
  getSeverityColor,
  getRecordStatusLabel,
  getRecordStatusColor,
  getStatusDotColor,
  shortId,
} from '@/utils/format';

interface ExceptionTableProps {
  records: ExceptionRecord[];
  loading: boolean;
  onReview: (r: ExceptionRecord) => void;
}

const typeToneMap: Record<string, any> = {
  index_invalid: 'orange',
  permission_missing: 'rose',
  schema_changed: 'violet',
  data_inconsistent: 'sky',
};

const severityToneMap: Record<string, any> = {
  high: 'red',
  medium: 'amber',
  low: 'emerald',
};

export const ExceptionTable: React.FC<ExceptionTableProps> = ({ records, loading, onReview }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="data-card p-4">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-5 w-16" />
              <div className="skeleton h-5 flex-1" />
              <div className="skeleton h-5 w-20" />
              <div className="skeleton h-5 w-16" />
              <div className="skeleton h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="data-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-zebra text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-36">
                记录 ID
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                异常类型
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">
                严重程度
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                异常描述
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-36">
                所属表
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                来源服务
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">
                处理状态
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider w-24 text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div className="text-sm">没有匹配的异常记录</div>
                    <div className="text-xs">请调整筛选条件或导入新的任务</div>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 cursor-pointer hover:bg-primary-50/40 transition-colors"
                  onClick={() =>
                    navigate(`/task/${r.taskId}/record/${r.id}`)
                  }
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-700 font-medium">
                      {shortId(r.id, 11)}
                    </span>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {formatDateTime(r.eventTime).substring(5, 16)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Tag tone={typeToneMap[r.type]} className="whitespace-nowrap">
                      {getExceptionTypeLabel(r.type)}
                    </Tag>
                  </td>
                  <td className="px-4 py-2.5">
                    <Tag tone={severityToneMap[r.severity]} className="whitespace-nowrap">
                      {getSeverityLabel(r.severity)}
                    </Tag>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-sm text-gray-800 leading-tight line-clamp-2 max-w-xl">
                      {r.description}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 truncate max-w-xl font-mono">
                      Event: {shortId(r.eventId, 12)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-0.5 border border-gray-200">
                      {r.tableName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-gray-600 font-mono">{r.sourceService}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <StatusDot color={getStatusDotColor(r.status)} />
                      <span
                        className={[
                          'text-xs font-medium inline-flex items-center px-2 py-0.5 border',
                          getRecordStatusColor(r.status),
                        ].join(' ')}
                      >
                        {getRecordStatusLabel(r.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/task/${r.taskId}/record/${r.id}`)}
                      >
                        详情
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<ArrowRightCircle className="w-3.5 h-3.5" />}
                        onClick={() => onReview(r)}
                      >
                        复核
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
