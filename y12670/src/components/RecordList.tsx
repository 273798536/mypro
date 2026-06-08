import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Clock, Filter, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface RecordListProps {
  className?: string;
}

const RecordList: React.FC<RecordListProps> = ({ className }) => {
  const { records, selectedRecordId, filter, selectRecord, setFilter, deleteRecord } = useAppStore();

  const filteredRecords = records.filter((record) =>
    filter === 'all' ? true : record.status === filter
  );

  const stats = {
    all: records.length,
    valid: records.filter((r) => r.status === 'valid').length,
    review: records.filter((r) => r.status === 'review').length,
    invalid: records.filter((r) => r.status === 'invalid').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
      case 'invalid':
        return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'review':
        return <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid':
        return '可直接使用';
      case 'invalid':
        return '不可用';
      case 'review':
        return '需工程师复核';
      default:
        return '未知';
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('flex flex-col h-full bg-slate-900', className)}>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            测量记录
            {stats.invalid > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                {stats.invalid} 条不可用
              </span>
            )}
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-1 mb-3">
          {[
            { key: 'all', label: '全部', count: stats.all, color: 'text-slate-300' },
            { key: 'valid', label: '可用', count: stats.valid, color: 'text-green-400' },
            { key: 'review', label: '复核', count: stats.review, color: 'text-yellow-400' },
            { key: 'invalid', label: '不可用', count: stats.invalid, color: 'text-red-400' },
          ].map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={cn(
                'flex flex-col items-center py-1.5 rounded-lg transition-colors text-xs',
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700'
              )}
            >
              <span className={cn(filter === key ? 'text-white' : color, 'text-sm font-semibold')}>
                {count}
              </span>
              <span className={cn(filter === key ? 'text-blue-100' : 'text-slate-500', 'text-[10px]')}>
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <Filter className="w-3 h-3" />
          <span>按状态筛选，月底转交时优先查看「不可用」和「复核」</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredRecords.map((record) => (
          <div
            key={record.id}
            className={cn(
              'p-3 rounded-lg cursor-pointer transition-all border group relative',
              selectedRecordId === record.id
                ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500/40'
                : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600'
            )}
          >
            <div className="flex items-start gap-2.5">
              {getStatusIcon(record.status)}
              <div className="flex-1 min-w-0" onClick={() => selectRecord(record.id)}>
                <h3 className="text-sm font-medium text-white truncate">
                  {record.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {formatDate(record.timestamp)} · {record.slices.length} 切片 · {record.unit}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded font-medium',
                      record.status === 'valid'
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : record.status === 'invalid'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                    )}
                  >
                    {getStatusText(record.status)}
                  </span>
                  {record.errors.length > 0 && (
                    <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                      {record.errors.length} 个问题
                    </span>
                  )}
                </div>
                {record.errors.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {record.errors.slice(0, 2).map((e, i) => (
                      <p
                        key={i}
                        className={cn(
                          'text-[11px] line-clamp-1',
                          e.severity === 'error' ? 'text-red-400' : 'text-yellow-400/80'
                        )}
                      >
                        · {e.message}
                      </p>
                    ))}
                    {record.errors.length > 2 && (
                      <p className="text-[10px] text-slate-500">
                        还有 {record.errors.length - 2} 个问题...
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`确定删除记录「${record.name}」吗？`)) {
                    deleteRecord(record.id);
                  }
                }}
                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="删除记录"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">暂无记录</p>
            <p className="text-xs text-slate-600 mt-1">点击右上角「导入数据」添加测量记录</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordList;
