import { useState } from 'react';
import { useLightingStore } from '@/store/lightingStore';
import {
  X,
  AlertTriangle,
  Download,
  MessageSquare,
  Send,
  MapPin,
  Database,
  Clock,
  CheckCircle2,
  Loader2,
  FileSearch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExceptionItem } from '@/types';

const severityConfig = {
  high: { color: 'red', label: '高危' },
  medium: { color: 'orange', label: '中危' },
  low: { color: 'yellow', label: '低危' }
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

export default function ExceptionDetail() {
  const {
    exceptions,
    points,
    selectedExceptionId,
    setSelectedExceptionId,
    getExceptionRemarks,
    addRemark,
    updateExceptionStatus,
    exportException
  } = useLightingStore();

  const [newRemark, setNewRemark] = useState('');
  const [resolution, setResolution] = useState('');
  const [showExportPreview, setShowExportPreview] = useState(false);

  const exception = exceptions.find((e) => e.id === selectedExceptionId);
  const remarks = selectedExceptionId ? getExceptionRemarks(selectedExceptionId) : [];
  const relatedPoints = points.filter((p) =>
    exception?.relatedPointIds.includes(p.id)
  );

  if (!exception) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>请从左侧列表选择一个异常查看详情</p>
        </div>
      </div>
    );
  }

  const severity = severityConfig[exception.severity];
  const status = statusConfig[exception.status];
  const exportData = selectedExceptionId ? exportException(selectedExceptionId) : '';

  const handleAddRemark = () => {
    if (!newRemark.trim() || !selectedExceptionId) return;
    addRemark({
      targetId: selectedExceptionId,
      targetType: 'exception',
      content: newRemark.trim(),
      author: '阿乔'
    });
    setNewRemark('');
  };

  const handleStatusChange = (newStatus: ExceptionItem['status']) => {
    if (!selectedExceptionId) return;
    updateExceptionStatus(selectedExceptionId, newStatus, resolution || undefined);
  };

  const handleExport = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `异常导出_${exception.id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">{exception.title}</h3>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                severity.color === 'red' ? 'bg-red-100 text-red-800' :
                severity.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                'bg-yellow-100 text-yellow-800'
              )}>
                {severity.label}
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
            <p className="text-sm text-gray-500 mt-1">
              {exception.id} · {typeLabels[exception.type]} · 处理人: {exception.assignee}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportPreview(!showExportPreview)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <FileSearch className="w-4 h-4" />
              预览导出
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              导出JSON
            </button>
            <button
              onClick={() => setSelectedExceptionId(null)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {showExportPreview && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-800">导出内容预览</h4>
            <button
              onClick={() => setShowExportPreview(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64 whitespace-pre-wrap break-all">
            {exportData}
          </pre>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            异常描述
          </h4>
          <p className="text-sm text-gray-700">{exception.description}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            关联点位空间位置 ({relatedPoints.length})
          </h4>
          <div className="space-y-2">
            {relatedPoints.map((point) => (
              <div key={point.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{point.name}</span>
                    {point.name !== point.originalName && (
                      <span className="ml-2 text-xs text-amber-600">
                        (原始: {point.originalName})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{point.id}</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                  <span className="text-gray-500">
                    坐标: <span className="font-mono text-gray-700">({point.x}, {point.y}, {point.z})</span>
                  </span>
                  <span className="text-gray-500">
                    展柜: <span className="text-gray-700">{point.showcaseName}</span>
                  </span>
                  <span className="text-gray-500">
                    照度: <span className="text-gray-700">{point.lux} lux</span>
                  </span>
                  <span className="text-gray-500">
                    CRI: <span className={cn(point.cri >= 90 ? 'text-green-600' : 'text-orange-600')}>{point.cri}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            原始证据链
          </h4>
          <div className="space-y-2">
            {exception.originalEvidence.map((ev, idx) => (
              <div key={idx} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="text-xs text-amber-800 font-medium mb-1">
                  证据 {idx + 1}: {ev.pointName}
                </div>
                <div className="text-xs text-amber-700 space-y-1 font-mono">
                  <div>原始坐标: X:{ev.coordinate.x} Y:{ev.coordinate.y} Z:{ev.coordinate.z}</div>
                  <div>来源文件: {ev.sourceFile}</div>
                  <div>行号: 第{ev.rowNumber}行</div>
                  <div>原始值: {ev.originalValue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-purple-500" />
            状态管理
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">更新状态:</span>
              <button
                onClick={() => handleStatusChange('pending')}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  exception.status === 'pending'
                    ? "bg-gray-600 text-white border-gray-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                )}
              >
                待处理
              </button>
              <button
                onClick={() => handleStatusChange('processing')}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  exception.status === 'processing'
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                )}
              >
                处理中
              </button>
              <button
                onClick={() => handleStatusChange('evidence_needed')}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  exception.status === 'evidence_needed'
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                )}
              >
                需补证据
              </button>
              <button
                onClick={() => handleStatusChange('resolved')}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1",
                  exception.status === 'resolved'
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                已解决
              </button>
            </div>
            {(exception.status === 'processing' || exception.status === 'resolved') && (
              <div>
                <label className="text-sm text-gray-600 block mb-1">处理说明:</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="请输入处理说明或解决方案..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            )}
            {exception.resolution && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                <div className="text-xs text-green-700 font-medium mb-1">
                  已记录的解决方案:
                </div>
                <p className="text-sm text-green-800">{exception.resolution}</p>
                {exception.resolvedAt && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    解决时间: {exception.resolvedAt}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-500" />
            人工备注 ({remarks.length})
          </h4>
          
          {remarks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无备注</p>
          ) : (
            <div className="space-y-3 mb-4">
              {remarks.map((remark) => (
                <div key={remark.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{remark.author}</span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {remark.createdAt}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{remark.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRemark()}
              placeholder="添加备注..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAddRemark}
              disabled={!newRemark.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3">时间线</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
              <div>
                <p className="text-sm text-gray-700">异常创建</p>
                <p className="text-xs text-gray-400">{exception.createdAt}</p>
              </div>
            </div>
            {exception.resolvedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <p className="text-sm text-gray-700">异常解决</p>
                  <p className="text-xs text-gray-400">{exception.resolvedAt}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
