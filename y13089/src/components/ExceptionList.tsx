import { useLightingStore } from '@/store/lightingStore';
import { AlertTriangle, Download, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExceptionItem } from '@/types';

const severityConfig = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'yellow', label: '低' }
};

const statusConfig = {
  pending: { color: 'gray', label: '待处理' },
  processing: { color: 'blue', label: '处理中' },
  resolved: { color: 'green', label: '已解决' },
  evidence_needed: { color: 'orange', label: '需补证据' }
};

const typeLabels: Record<ExceptionItem['type'], string> = {
  name_inconsistency: '名称不一致',
  lux_out_of_range: '照度超标',
  cri_too_low: 'CRI偏低',
  adjacent_merge_ambiguous: '合并歧义',
  missing_coordinate: '坐标缺失',
  duplicate_point: '点位重复'
};

export default function ExceptionList() {
  const {
    exceptions,
    selectedExceptionId,
    setSelectedExceptionId,
    exportException
  } = useLightingStore();

  const handleExport = (e: React.MouseEvent, exceptionId: string) => {
    e.stopPropagation();
    const data = exportException(exceptionId);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `异常导出_${exceptionId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sortedExceptions = [...exceptions].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            异常队列
          </h3>
          <span className="text-sm text-gray-500">
            共 {exceptions.length} 条异常
          </span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-600">高 {exceptions.filter(e => e.severity === 'high').length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-gray-600">中 {exceptions.filter(e => e.severity === 'medium').length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-600">低 {exceptions.filter(e => e.severity === 'low').length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {sortedExceptions.map((exception) => {
            const isSelected = selectedExceptionId === exception.id;
            const severity = severityConfig[exception.severity];
            const status = statusConfig[exception.status];

            return (
              <li
                key={exception.id}
                onClick={() => setSelectedExceptionId(isSelected ? null : exception.id)}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  isSelected
                    ? "bg-red-50 border-l-4 border-red-500"
                    : "hover:bg-gray-50 border-l-4 border-transparent"
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={cn(
                      "w-5 h-5 flex-shrink-0",
                      severity.color === 'red' ? 'text-red-500' :
                      severity.color === 'orange' ? 'text-orange-500' : 'text-yellow-500'
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900">
                        {exception.title}
                      </span>
                      <button
                        onClick={(e) => handleExport(e, exception.id)}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="导出异常详情"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        severity.color === 'red' ? 'bg-red-100 text-red-800' :
                        severity.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      )}>
                        {severity.label}危
                      </span>
                      <span className="text-xs text-gray-500">
                        {typeLabels[exception.type]}
                      </span>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        status.color === 'gray' ? 'bg-gray-100 text-gray-800' :
                        status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        status.color === 'green' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      )}>
                        {status.label}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {exception.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {exception.createdAt}
                      </span>
                      <span>处理人: {exception.assignee}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
