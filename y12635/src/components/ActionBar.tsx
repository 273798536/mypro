import {
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Flag,
  ChevronRight,
  Circle,
} from "lucide-react";
import type { Player } from "../types";
import { cn } from "../lib/utils";

interface ActionBarProps {
  canUndo: boolean;
  canRedo: boolean;
  currentPlayer: Player;
  onPlayerChange: (player: Player) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onExport: () => void;
  onGoToResult: () => void;
}

export function ActionBar({
  canUndo,
  canRedo,
  currentPlayer,
  onPlayerChange,
  onUndo,
  onRedo,
  onReset,
  onExport,
  onGoToResult,
}: ActionBarProps) {
  return (
    <div className="card p-3 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mr-2">
        <button
          type="button"
          onClick={() => onPlayerChange("black")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
            currentPlayer === "black"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Circle className="w-3 h-3 fill-slate-900 text-slate-900" />
          黑方
        </button>
        <button
          type="button"
          onClick={() => onPlayerChange("white")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
            currentPlayer === "white"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Circle className="w-3 h-3 fill-white text-slate-300" />
          白方
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 mx-1" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="btn-ghost !px-3 !py-1.5 text-xs"
        title="撤销 (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
        撤销
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="btn-ghost !px-3 !py-1.5 text-xs"
        title="重做 (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
        重做
      </button>
      <button
        type="button"
        onClick={onReset}
        className="btn-ghost !px-3 !py-1.5 text-xs hover:!text-red-600 hover:!bg-red-50"
        title="清空棋盘"
      >
        <RotateCcw className="w-4 h-4" />
        重置
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onGoToResult}
        className="btn-secondary !px-3 !py-1.5 text-xs"
      >
        <Flag className="w-4 h-4" />
        结算
        <ChevronRight className="w-3.5 h-3.5 -ml-1" />
      </button>
      <button
        type="button"
        onClick={onExport}
        className="btn-primary !px-3 !py-1.5 text-xs"
      >
        <Download className="w-4 h-4" />
        导出 JSON
      </button>
    </div>
  );
}
