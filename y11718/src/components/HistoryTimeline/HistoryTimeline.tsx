import { History, User, Plus, Edit2, Trash2, Wrench } from 'lucide-react';
import { useExperimentStore } from '../../store/useExperimentStore';
import { HistoryRecord } from '../../types';

export default function HistoryTimeline() {
  const { history } = useExperimentStore();

  const getChangeTypeIcon = (type: HistoryRecord['changeType']) => {
    switch (type) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-400" />;
      case 'update':
        return <Edit2 className="w-4 h-4 text-cyan-400" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'correct':
        return <Wrench className="w-4 h-4 text-orange-400" />;
    }
  };

  const getChangeTypeLabel = (type: HistoryRecord['changeType']) => {
    switch (type) {
      case 'create':
        return '创建';
      case 'update':
        return '修改';
      case 'delete':
        return '删除';
      case 'correct':
        return '修正';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          操作记录
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          共 {history.length} 条记录
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-400 text-sm">暂无操作记录</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-700" />
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="relative pl-8">
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center z-10">
                    {getChangeTypeIcon(record.changeType)}
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200">
                          {getChangeTypeLabel(record.changeType)}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {record.operator}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatTime(record.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2">{record.reason}</p>
                    {Object.keys(record.after).length > 0 && Object.keys(record.after).length <= 5 && (
                      <div className="mt-2 pt-2 border-t border-slate-600">
                        {Object.entries(record.after).map(([key, value]) => {
                          const beforeVal = (record.before as any)[key];
                          const afterVal = value;
                          return (
                            <div key={key} className="text-xs text-slate-400 mb-1">
                              <span className="text-slate-500">{key}:</span>{' '}
                              {beforeVal !== undefined && beforeVal !== null && (
                                <span className="text-red-400 line-through mr-2">
                                  {formatValue(beforeVal)}
                                </span>
                              )}
                              <span className="text-green-400">{formatValue(afterVal)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
