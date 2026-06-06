import {
  MousePointer2, Hand, Filter, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  Download, FlipVertical, AlertCircle, CheckCircle, Plus, Trash2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ToolType, BerthStatus } from '../../types';

const tools: { type: ToolType; icon: any; label: string }[] = [
  { type: 'select', icon: MousePointer2, label: '选择/拖拽' },
  { type: 'pan', icon: Hand, label: '平移画布' },
  { type: 'filter', icon: Filter, label: '筛选器' },
];

const statusOptions: { value: BerthStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'text-slate-300' },
  { value: 'available', label: '空闲', color: 'text-port-success' },
  { value: 'occupied', label: '已靠泊', color: 'text-port-deep' },
  { value: 'maintenance', label: '维护中', color: 'text-port-warning' },
];

export default function CanvasToolbar({ onExport }: { onExport: () => void }) {
  const {
    canvas, setCanvas, filter, setFilter,
    undo, redo, canUndo, canRedo,
    toggleCoordinateFlip, berths,
  } = useStore();

  return (
    <div className="h-14 bg-port-panel border-b border-port-border flex items-center justify-between px-4">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 bg-port-bg rounded-lg p-1 mr-4">
          {tools.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setCanvas({ tool: type })}
              title={label}
              className={`p-2 rounded-md transition-all ${
                canvas.tool === type
                  ? 'bg-port-deep text-white'
                  : 'text-slate-400 hover:text-white hover:bg-port-border'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-port-border mx-2" />

        <div className="flex items-center gap-1 bg-port-bg rounded-lg p-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            title="撤销 (Ctrl+Z)"
            className={`p-2 rounded-md transition-all ${
              canUndo()
                ? 'text-slate-300 hover:text-white hover:bg-port-border'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="重做 (Ctrl+Y)"
            className={`p-2 rounded-md transition-all ${
              canRedo()
                ? 'text-slate-300 hover:text-white hover:bg-port-border'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-port-border mx-2" />

        <div className="flex items-center gap-1 bg-port-bg rounded-lg p-1">
          <button
            onClick={() => setCanvas({ zoom: Math.max(0.25, canvas.zoom - 0.1) })}
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-port-border transition-all"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-mono text-slate-300 min-w-[48px] text-center">
            {Math.round(canvas.zoom * 100)}%
          </span>
          <button
            onClick={() => setCanvas({ zoom: Math.min(3, canvas.zoom + 0.1) })}
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-port-border transition-all"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCanvas({ zoom: 1, panX: 0, panY: 0 })}
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-port-border transition-all"
            title="重置视图"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-port-border mx-2" />

        <button
          onClick={toggleCoordinateFlip}
          title={canvas.isCoordinateFlipped ? '恢复标准坐标系（Y轴向上）' : 'Y轴翻转（检查坐标问题）'}
          className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
            canvas.isCoordinateFlipped
              ? 'bg-port-warning/20 text-port-warning border border-port-warning/50'
              : 'bg-port-bg text-slate-300 hover:bg-port-border'
          }`}
        >
          <FlipVertical className="w-4 h-4" />
          {canvas.isCoordinateFlipped ? 'Y轴已翻转' : '坐标系'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">比例尺:</span>
          <span className="text-xs font-mono text-slate-200">1px = {canvas.scale}{canvas.scaleUnit}</span>
          {canvas.scale !== 50 && (
            <AlertCircle className="w-3.5 h-3.5 text-port-warning" title="非标准比例尺，注意核对" />
          )}
        </div>

        <div className="flex items-center gap-1 bg-port-bg rounded-lg p-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter({ status: opt.value === 'all' ? undefined : (opt.value as BerthStatus) })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                (filter.status || 'all') === opt.value
                  ? 'bg-port-deep text-white'
                  : `${opt.color} hover:bg-port-border`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-port-border mx-1" />

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-port-success" />
            {berths.filter((b) => b.status === 'available').length}空闲
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-port-danger" />
            {berths.filter((b) => b.hasError).length}异常
          </span>
        </div>

        <div className="h-6 w-px bg-port-border mx-1" />

        <button
          onClick={onExport}
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          <Download className="w-4 h-4" />
          导出
        </button>
      </div>
    </div>
  );
}
