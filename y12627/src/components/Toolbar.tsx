import { ZoomIn, ZoomOut, Maximize2, Grid3X3, RotateCcw, Download, AlertCircle, RefreshCw, Play } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useExport } from '@/hooks/useExport';
import { useState } from 'react';
import { ExportModal } from './ExportModal';

interface ToolbarProps {
  onTriggerError: () => void;
  onTriggerRecovery: () => void;
  hasScaleError: boolean;
}

export function Toolbar({ onTriggerError, onTriggerRecovery, hasScaleError }: ToolbarProps) {
  const {
    snapEnabled,
    setSnapEnabled,
    zoomIn,
    zoomOut,
    resetZoom,
    resetCanvas
  } = useCanvasStore();

  const [showExport, setShowExport] = useState(false);
  const { getExportPreview } = useExport();

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="panel-card rounded-2xl px-4 py-3 shadow-lg flex items-center gap-2">
          <div className="flex items-center gap-1 pr-3 border-r border-ocean-200">
            <button
              onClick={zoomOut}
              className="p-2 rounded-lg hover:bg-ocean-100 transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5 text-ocean-700" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 rounded-lg hover:bg-ocean-100 transition-colors"
              title="重置缩放"
            >
              <Maximize2 className="w-5 h-5 text-ocean-700" />
            </button>
            <button
              onClick={zoomIn}
              className="p-2 rounded-lg hover:bg-ocean-100 transition-colors"
              title="放大"
            >
              <ZoomIn className="w-5 h-5 text-ocean-700" />
            </button>
          </div>

          <div className="flex items-center gap-1 pr-3 border-r border-ocean-200">
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                snapEnabled ? 'bg-ocean-100 text-ocean-800' : 'hover:bg-ocean-50 text-ocean-500'
              }`}
              title={snapEnabled ? '关闭网格吸附' : '开启网格吸附'}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <span className="text-xs text-ocean-600 ml-1">
              吸附{snapEnabled ? '开' : '关'}
            </span>
          </div>

          <div className="flex items-center gap-1 pr-3 border-r border-ocean-200">
            <button
              onClick={onTriggerError}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1 ${
                hasScaleError
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'btn-danger'
              }`}
              disabled={hasScaleError}
            >
              <AlertCircle className="w-4 h-4" />
              {hasScaleError ? '错误已触发' : '触发错误演示'}
            </button>
            <button
              onClick={onTriggerRecovery}
              className="btn-success flex items-center gap-1"
              disabled={!hasScaleError}
            >
              <RefreshCw className="w-4 h-4" />
              恢复操作
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={resetCanvas}
              className="p-2 rounded-lg hover:bg-ocean-100 transition-colors"
              title="重置画布"
            >
              <RotateCcw className="w-5 h-5 text-ocean-700" />
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="btn-primary flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出结果
            </button>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <div className="panel-card rounded-xl px-4 py-3 shadow-md">
          <p className="text-xs text-ocean-600 mb-1">💡 操作提示</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 滚轮缩放画布</li>
            <li>• 拖拽空白区域平移</li>
            <li>• 拖拽展缸移动位置</li>
            <li>• 点击展缸查看详情</li>
          </ul>
        </div>
      </div>

      <div className="absolute top-4 left-80 z-10 ml-4">
        <div className="panel-card rounded-xl px-4 py-3 shadow-md">
          <p className="font-display text-lg text-ocean-700 flex items-center gap-2">
            <Play className="w-5 h-5" fill="currentColor" />
            水族馆展缸平面排布
          </p>
          <p className="text-xs text-ocean-500 mt-0.5">教学演示工具</p>
        </div>
      </div>

      {showExport && (
        <ExportModal
          preview={getExportPreview()}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
