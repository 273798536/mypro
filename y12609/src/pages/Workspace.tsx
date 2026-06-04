import { Toolbar } from '@/components/panels/Toolbar';
import { ValidationPanel } from '@/components/panels/ValidationPanel';
import { HistoryPanel } from '@/components/panels/HistoryPanel';
import { WarehouseCanvas } from '@/components/canvas/WarehouseCanvas';
import { useState } from 'react';
import { History, X } from 'lucide-react';

export default function Workspace() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="h-full flex">
      {showHistory && (
        <div className="relative">
          <HistoryPanel />
          <button
            onClick={() => setShowHistory(false)}
            className="absolute top-2 right-2 p-1 hover:bg-slate-100 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <Toolbar />

      <div className="flex-1 relative flex flex-col">
        <div className="h-10 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50 font-mono"
              >
                <History size={14} />
                显示历史
              </button>
            )}
            <span className="text-[10px] text-slate-400 font-mono">
              提示: 绘制模式下点击起点或按 Enter 完成，右键/ESC 取消
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-mono">实时校验运行中</span>
          </div>
        </div>

        <div className="flex-1">
          <WarehouseCanvas />
        </div>
      </div>

      <ValidationPanel />
    </div>
  );
}
