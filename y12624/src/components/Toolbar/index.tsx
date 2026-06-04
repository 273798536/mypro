import React from 'react';
import { Undo2, Redo2, Filter, FileDown, Plus, RotateCcw } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface ToolbarProps {
  onToggleFilter: () => void;
  onExport: () => void;
  onAddRecord: () => void;
  showFilter: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onToggleFilter,
  onExport,
  onAddRecord,
  showFilter,
}) => {
  const { undo, redo, canUndo, canRedo, records } = useCanvasStore();

  const flippedCount = records.filter(r => r.status === 'flipped').length;
  const warningCount = records.filter(r => r.status === 'warning').length;

  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded border-2 transition-all ${
            canUndo
              ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-slate-200'
              : 'border-slate-700 text-slate-600 cursor-not-allowed'
          }`}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded border-2 transition-all ${
            canRedo
              ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-slate-200'
              : 'border-slate-700 text-slate-600 cursor-not-allowed'
          }`}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-slate-700 mx-2" />

      <button
        onClick={onToggleFilter}
        className={`p-2 rounded border-2 transition-all flex items-center gap-2 ${
          showFilter
            ? 'border-fire-dark bg-fire-dark/20 text-blue-400'
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-slate-200'
        }`}
      >
        <Filter size={18} />
        <span className="text-sm">筛选</span>
      </button>

      <button
        onClick={onAddRecord}
        className="p-2 rounded border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2"
      >
        <Plus size={18} />
        <span className="text-sm">补录</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-fire-red animate-pulse" />
          <span className="text-fire-red">{flippedCount} 翻转</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-fire-warning" />
          <span className="text-fire-warning">{warningCount} 警告</span>
        </div>
        <span className="text-slate-400">共 {records.length} 条记录</span>
      </div>

      <div className="w-px h-6 bg-slate-700 mx-2" />

      <button
        onClick={onExport}
        className="px-4 py-2 rounded border-2 border-fire-red bg-fire-red/10 hover:bg-fire-red/20 text-fire-red transition-all flex items-center gap-2 font-medium"
      >
        <FileDown size={18} />
        <span>导出报告</span>
      </button>

      <button
        onClick={() => window.location.reload()}
        className="p-2 rounded border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-slate-200 transition-all"
        title="重置"
      >
        <RotateCcw size={18} />
      </button>
    </div>
  );
};
