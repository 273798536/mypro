import { useCanvasStore } from '@/stores/useCanvasStore';
import { useBatchStore } from '@/stores/useBatchStore';
import { useNavigate } from 'react-router-dom';
import {
  MousePointer2,
  Move,
  PenTool,
  Hand,
  Undo2,
  Redo2,
  Download,
  FileText,
  Upload,
  Map,
  RotateCcw,
} from 'lucide-react';
import { useUndoRedo } from '@/hooks/useUndoRedo';

export function Toolbar() {
  const { activeTool, setActiveTool } = useCanvasStore();
  const { resetBatch, canvasState, setCanvasState } = useBatchStore();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const navigate = useNavigate();

  const tools = [
    { id: 'select' as const, icon: MousePointer2, label: '选择' },
    { id: 'drag' as const, icon: Move, label: '拖拽' },
    { id: 'annotate' as const, icon: PenTool, label: '标注' },
    { id: 'pan' as const, icon: Hand, label: '平移' },
  ];

  const handleResetView = () => {
    setCanvasState({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#1e3a5f] text-white">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <Map size={22} className="text-amber-400" />
          <h1 className="font-bold text-lg tracking-wide" style={{ fontFamily: "'Roboto Slab', serif" }}>
            工地安全风险贴图
          </h1>
        </div>

        <div className="h-6 w-px bg-white/20" />

        <div className="flex items-center gap-1 ml-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                activeTool === tool.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={tool.label}
            >
              <tool.icon size={16} />
              <span className="hidden md:inline">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-white/20 mx-2" />

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-sm transition-all ${
              canUndo
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-white/30 cursor-not-allowed'
            }`}
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-sm transition-all ${
              canRedo
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-white/30 cursor-not-allowed'
            }`}
            title="重做 (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
          <button
            onClick={handleResetView}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="重置视图"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="h-6 w-px bg-white/20 mx-2" />

        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>缩放: {(canvasState.scale * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/import')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
        >
          <Upload size={16} />
          <span className="hidden sm:inline">导入设备</span>
        </button>
        <button
          onClick={() => navigate('/report')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
        >
          <FileText size={16} />
          <span className="hidden sm:inline">报告</span>
        </button>
        <button
          onClick={() => navigate('/export')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded text-sm font-medium transition-colors"
        >
          <Download size={16} />
          <span className="hidden sm:inline">导出</span>
        </button>
        <button
          onClick={() => {
            if (confirm('确定要重置所有操作吗？此操作不可撤销。')) {
              resetBatch();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded text-sm transition-colors"
        >
          <RotateCcw size={16} />
          <span className="hidden sm:inline">重置</span>
        </button>
      </div>
    </div>
  );
}
