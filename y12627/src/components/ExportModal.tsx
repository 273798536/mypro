import { X, FileText, FileJson, Download, Clock, Hash, AlertTriangle } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { useCanvasStore } from '@/store/useCanvasStore';

interface ExportModalProps {
  preview: {
    fileName: string;
    tankCount: number;
    recordCount: number;
    errorCount: number;
    scaleRatio: string;
    sessionId: string;
    sessionTime: string;
  };
  onClose: () => void;
}

export function ExportModal({ preview, onClose }: ExportModalProps) {
  const { exportCsv, exportJson } = useExport();
  const { previousSessions } = useCanvasStore();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}小时${minutes % 60}分`;
    if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
    return `${seconds}秒`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-ocean-600 to-ocean-700 px-6 py-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-white">导出结果</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="panel-card rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">文件名</p>
            <p className="font-mono text-sm text-ocean-700 bg-ocean-50 px-3 py-2 rounded-lg break-all">
              {preview.fileName}
            </p>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              会话ID：{preview.sessionId}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-ocean-50 rounded-xl">
              <p className="text-2xl font-bold text-ocean-700">{preview.tankCount}</p>
              <p className="text-xs text-gray-500">展缸数</p>
            </div>
            <div className="text-center p-3 bg-ocean-50 rounded-xl">
              <p className="text-2xl font-bold text-ocean-700">{preview.recordCount}</p>
              <p className="text-xs text-gray-500">操作记录</p>
            </div>
            <div className={`text-center p-3 rounded-xl ${preview.errorCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-2xl font-bold ${preview.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {preview.errorCount}
              </p>
              <p className="text-xs text-gray-500">异常数</p>
            </div>
            <div className="text-center p-3 bg-ocean-50 rounded-xl">
              <p className="text-2xl font-bold text-ocean-700">{preview.scaleRatio}</p>
              <p className="text-xs text-gray-500">比例尺</p>
            </div>
          </div>

          <div className="panel-card rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              本次运行信息
            </p>
            <div className="space-y-1 text-sm">
              <p>开始时间：<span className="text-ocean-700">{preview.sessionTime}</span></p>
              <p>已运行：<span className="text-ocean-700">{formatDuration(Date.now() - useCanvasStore.getState().sessionStartTime)}</span></p>
            </div>
          </div>

          {previousSessions.length > 0 && (
            <div className="panel-card rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-2">📋 历史运行记录（用于区分本次/上次）</p>
              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                {previousSessions.map((sess, idx) => (
                  <div key={sess.sessionId} className="text-xs bg-gray-50 px-3 py-2 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-gray-400">#{idx + 1}</span>
                      <span className="ml-2 text-gray-600">{new Date(sess.startTime).toLocaleString()}</span>
                    </div>
                    <span className="text-ocean-600">{sess.recordCount}条记录</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.errorCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                导出内容包含异常追溯说明
              </p>
              <p className="text-xs text-red-600 mt-1">
                文件中将包含：异常数据定位、颜色规则说明、处理意见、离线素材位置等信息，方便不懂代码的同事查阅。
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { exportCsv(); onClose(); }}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              导出 CSV
            </button>
            <button
              onClick={() => { exportJson(); onClose(); }}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              导出 JSON
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            💡 文件名包含会话ID和时间戳，可区分不同运行批次
          </p>
        </div>
      </div>
    </div>
  );
}
