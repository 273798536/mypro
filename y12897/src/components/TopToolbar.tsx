import { useNavigate } from 'react-router-dom';
import { FileText, Settings, Layers, RefreshCw, Info } from 'lucide-react';
import { useSceneStore, useProcessStore } from '@/stores';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function TopToolbar() {
  const navigate = useNavigate();
  const { clippingEnabled, toggleClipping } = useSceneStore();
  const { runProcessing, records } = useProcessStore();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = () => {
    if (isRecalculating) return;
    setIsRecalculating(true);
    runProcessing();
    setTimeout(() => {
      setIsRecalculating(false);
      console.log(
        `%c[重算完成] 共处理 ${records.length} 条记录，${records.reduce((s, r) => s + r.anomalies.length, 0)} 个异常点`,
        'color:#10b981;'
      );
    }, 300);
  };

  return (
    <div className="h-12 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Layers size={16} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-200">溢油复盘工作台</span>
        <span className="text-xs text-slate-500 ml-2 px-2 py-0.5 bg-slate-800 rounded">
          v1.0
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleClipping}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
            clippingEnabled
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
        >
          <Layers size={15} />
          剖切
        </button>

        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
            isRecalculating
              ? 'bg-cyan-600/30 text-cyan-300 cursor-wait'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
        >
          <RefreshCw size={15} className={cn(isRecalculating && 'animate-spin')} />
          {isRecalculating ? '重算中...' : '重算'}
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <button
          onClick={() => navigate('/report')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <FileText size={15} />
          报告
        </button>

        <button
          onClick={() => console.log('%c[设置] 打开设置面板', 'color:#a78bfa;')}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Settings size={18} />
        </button>

        <button
          onClick={() =>
            console.log(
              '%c[帮助] 操作说明：左键旋转 / 滚轮缩放 / 右键平移 / 点击对象查看详情',
              'color:#60a5fa;'
            )
          }
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
