
import React from 'react';
import { Clock, User, FileText, ArrowRight } from 'lucide-react';
import { AuditLog } from '../types';
import { formatDate } from '../utils/formatter';

interface AuditTimelineProps {
  logs: AuditLog[];
  title?: string;
}

const AuditTimeline: React.FC<AuditTimelineProps> = ({
  logs,
  title = '审计追踪',
}) => {
  const sortedLogs = [...logs].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const getActionColor = (action: string) => {
    if (action.includes('清算') || action.includes('完成')) {
      return 'bg-green-500';
    }
    if (action.includes('异常') || action.includes('标记')) {
      return 'bg-red-500';
    }
    if (action.includes('复核') || action.includes('调整')) {
      return 'bg-amber-500';
    }
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">
          共 {logs.length} 条操作记录，所有变更均可追溯
        </p>
      </div>

      <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6">
            {sortedLogs.map((log, index) => (
              <div key={log.logId} className="relative pl-12">
                <div
                  className={`absolute left-3 w-4 h-4 rounded-full border-2 border-white shadow-sm ${getActionColor(
                    log.action
                  )}`}
                />

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                        {log.action}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.operator}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(log.createdAt)}
                    </span>
                  </div>

                  {log.txId && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">关联交易: </span>
                      <span className="text-xs font-mono text-gray-700">
                        {log.txId}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">{log.fieldName}:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono text-xs">
                        {log.beforeValue || '(空)'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-xs">
                        {log.afterValue || '(空)'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FileText className="w-3 h-3" />
                      <span>来源: {log.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          暂无审计记录
        </div>
      )}
    </div>
  );
};

export default AuditTimeline;
