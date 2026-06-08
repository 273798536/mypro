import React from 'react';
import {
  AlertTriangle,
  Info,
  Calendar,
  User,
  MapPin,
  Ruler,
  Layers,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { ValidationError } from '@/types';

interface RecordDetailsProps {
  className?: string;
}

const RecordDetails: React.FC<RecordDetailsProps> = ({ className }) => {
  const { records, selectedRecordId, selectedSliceId, selectSlice, updateRecord, deleteRecord } = useAppStore();
  const selectedRecord = records.find((r) => r.id === selectedRecordId);

  if (!selectedRecord) {
    return (
      <div className={cn('flex flex-col h-full bg-slate-900 p-6', className)}>
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">选择一条记录查看详情</p>
            <p className="text-xs text-slate-600 mt-1">点击左侧列表中的记录</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkAsValid = () => {
    updateRecord(selectedRecord.id, {
      status: 'valid',
      errors: selectedRecord.errors.filter((e) => e.severity === 'warning' && e.field?.startsWith('review')),
    });
  };

  const handleMarkAsReview = () => {
    updateRecord(selectedRecord.id, { status: 'review' });
  };

  const handleMarkAsInvalid = () => {
    updateRecord(selectedRecord.id, { status: 'invalid' });
  };

  const getSeverityIcon = (severity: ValidationError['severity']) => {
    if (severity === 'error') return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />;
    return <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />;
  };

  return (
    <div className={cn('flex flex-col h-full bg-slate-900', className)}>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">记录详情</h2>
          <span
            className={cn(
              'text-xs px-2.5 py-1 rounded-full font-medium',
              selectedRecord.status === 'valid' && 'bg-green-500/20 text-green-400 border border-green-500/30',
              selectedRecord.status === 'review' && 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
              selectedRecord.status === 'invalid' && 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}
          >
            {selectedRecord.status === 'valid' ? '可直接使用' : selectedRecord.status === 'review' ? '需工程师复核' : '不可用'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-white mb-3">{selectedRecord.name}</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400 w-16">检测时间</span>
              <span className="text-slate-200">{formatDate(selectedRecord.timestamp)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Ruler className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400 w-16">深度单位</span>
              <span className="text-slate-200">{selectedRecord.unit}</span>
            </div>
            {selectedRecord.metadata.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400 w-16">检测位置</span>
                <span className="text-slate-200">{selectedRecord.metadata.location}</span>
              </div>
            )}
            {selectedRecord.metadata.operator && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400 w-16">检测人员</span>
                <span className="text-slate-200">{selectedRecord.metadata.operator}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm pt-2 border-t border-slate-700">
              <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400 w-16">切片数量</span>
              <span className="text-slate-200">{selectedRecord.slices.length} 片</span>
              {selectedRecord.expectedValueRange && (
                <span className="text-xs text-slate-500 ml-2">
                  数值范围 [{selectedRecord.expectedValueRange.min}, {selectedRecord.expectedValueRange.max}]
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              切片列表（点击在 3D 视图中高亮）
            </h3>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-700/50">
            {selectedRecord.slices.map((slice) => {
              const range = selectedRecord.expectedValueRange || { min: 0, max: 1 };
              let oobCount = 0;
              slice.data.forEach((row) =>
                row.forEach((v) => {
                  if (typeof v !== 'number' || isNaN(v) || v < range.min || v > range.max) oobCount++;
                })
              );
              return (
                <button
                  key={slice.id}
                  onClick={() => selectSlice(slice.id === selectedSliceId ? null : slice.id)}
                  className={cn(
                    'w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors hover:bg-slate-700/50',
                    selectedSliceId === slice.id && 'bg-blue-500/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 transition-transform',
                        selectedSliceId === slice.id && 'text-blue-400 rotate-90'
                      )}
                    />
                    <span className="text-sm text-slate-200">
                      第 {slice.index + 1} 片
                    </span>
                    <span className="text-xs text-slate-500">
                      深度 {slice.depth}{slice.depthUnit || selectedRecord.unit}
                    </span>
                  </div>
                  {oobCount > 0 ? (
                    <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                      {oobCount} 处越界
                    </span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedRecord.errors.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                问题与处理建议
                <span className="text-xs font-normal text-slate-400">({selectedRecord.errors.length})</span>
              </h3>
            </div>
            <div className="p-3 space-y-2.5">
              {selectedRecord.errors.map((error, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-3 rounded-lg border',
                    error.severity === 'error'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(error.severity)}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          error.severity === 'error' ? 'text-red-300' : 'text-yellow-300'
                        )}
                      >
                        {error.message}
                      </p>
                      {error.suggestion && (
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-slate-400 leading-relaxed">{error.suggestion}</p>
                        </div>
                      )}
                      {error.field && (
                        <p className="text-xs text-slate-500 mt-1">字段: {error.field}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-white mb-3">状态管理</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleMarkAsValid}
              disabled={selectedRecord.status === 'valid'}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1',
                selectedRecord.status === 'valid'
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-slate-700 text-slate-300 hover:bg-green-600 hover:text-white'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              可用
            </button>
            <button
              onClick={handleMarkAsReview}
              disabled={selectedRecord.status === 'review'}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1',
                selectedRecord.status === 'review'
                  ? 'bg-yellow-600 text-white cursor-default'
                  : 'bg-slate-700 text-slate-300 hover:bg-yellow-600 hover:text-white'
              )}
            >
              <AlertCircle className="w-4 h-4" />
              需复核
            </button>
            <button
              onClick={handleMarkAsInvalid}
              disabled={selectedRecord.status === 'invalid'}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1',
                selectedRecord.status === 'invalid'
                  ? 'bg-red-600 text-white cursor-default'
                  : 'bg-slate-700 text-slate-300 hover:bg-red-600 hover:text-white'
              )}
            >
              <XCircle className="w-4 h-4" />
              不可用
            </button>
          </div>
          <button
            onClick={() => {
              if (confirm(`确定删除记录「${selectedRecord.name}」吗？`)) {
                deleteRecord(selectedRecord.id);
              }
            }}
            className="mt-3 w-full px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-slate-700"
          >
            删除此记录
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordDetails;
