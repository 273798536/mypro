import { MousePointer2, PenTool, Move, Trash2, Undo2, Redo2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ToolMode } from '@/types';

export function Toolbar() {
  const {
    toolMode,
    setToolMode,
    selectedLevel,
    setSelectedLevel,
    colorRules,
    undo,
    redo,
    canUndo,
    canRedo,
    resetToSample,
    zoom,
    setZoom,
    loadSample,
    samples,
    currentSampleId
  } = useStore();

  const tools: { mode: ToolMode; icon: typeof MousePointer2; label: string }[] = [
    { mode: 'select', icon: MousePointer2, label: '选择' },
    { mode: 'draw', icon: PenTool, label: '绘制' },
    { mode: 'pan', icon: Move, label: '平移' },
    { mode: 'delete', icon: Trash2, label: '删除' }
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-mono text-sm font-bold text-slate-800 tracking-wide">工具面板</h2>
      </div>

      <div className="p-4 border-b border-slate-200">
        <label className="text-xs text-slate-500 mb-2 block">选择样例</label>
        <select
          value={currentSampleId || ''}
          onChange={(e) => loadSample(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500 font-mono"
        >
          {samples.map(sample => (
            <option key={sample.id} value={sample.id}>
              {sample.name} {sample.isDraft && '(草稿)'}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 border-b border-slate-200">
        <label className="text-xs text-slate-500 mb-2 block">绘图工具</label>
        <div className="grid grid-cols-4 gap-1">
          {tools.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setToolMode(mode)}
              className={`flex flex-col items-center justify-center p-2 rounded border-2 transition-all ${
                toolMode === mode
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
              title={label}
            >
              <Icon size={18} />
              <span className="text-[10px] mt-1 font-mono">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-slate-200">
        <label className="text-xs text-slate-500 mb-2 block">热区等级</label>
        <div className="space-y-1">
          {colorRules.map(rule => (
            <button
              key={rule.id}
              onClick={() => setSelectedLevel(rule.level)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded border-2 transition-all ${
                selectedLevel === rule.level
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className="w-4 h-4 rounded border border-slate-400"
                style={{ backgroundColor: rule.color }}
              />
              <span className="text-xs font-mono text-slate-700">
                L{rule.level} · {rule.label}
              </span>
              <span className="text-[10px] text-slate-400 ml-auto font-mono">
                {rule.minFrequency}-{rule.maxFrequency}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-slate-200">
        <label className="text-xs text-slate-500 mb-2 block">历史操作</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs border-2 border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Undo2 size={14} />
            <span className="font-mono">撤销</span>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs border-2 border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Redo2 size={14} />
            <span className="font-mono">重做</span>
          </button>
          <button
            onClick={resetToSample}
            className="col-span-2 flex items-center justify-center gap-1 px-3 py-2 text-xs border-2 border-amber-300 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-all"
          >
            <RotateCcw size={14} />
            <span className="font-mono">重置为样例初始状态</span>
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-200">
        <label className="text-xs text-slate-500 mb-2 block">视图控制</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(zoom * 0.8)}
            className="flex-1 flex items-center justify-center py-2 border-2 border-slate-200 rounded hover:bg-slate-50"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono text-slate-600 w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(zoom * 1.25)}
            className="flex-1 flex items-center justify-center py-2 border-2 border-slate-200 rounded hover:bg-slate-50"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 mt-auto">
        <div className="text-[10px] text-slate-400 font-mono space-y-1">
          <p>快捷键:</p>
          <p>• V - 选择工具</p>
          <p>• D - 绘制工具</p>
          <p>• H - 平移工具</p>
          <p>• Ctrl+Z - 撤销</p>
          <p>• Ctrl+Y - 重做</p>
          <p>• ESC - 取消/取消选择</p>
        </div>
      </div>
    </div>
  );
}
