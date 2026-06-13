import { FileText, RefreshCw, Scroll, Database } from 'lucide-react';
import { useSpeckleStore } from '@/store/useSpeckleStore';
import { cn } from '@/lib/utils';

export function Toolbar() {
  const { dataset, loadSample, startRerun, setSummaryOpen, isRerunning, rerunProgress } =
    useSpeckleStore();

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-wide">激光散斑参数回放</h1>
          <p className="text-xs text-slate-400">
            {dataset ? `${dataset.deviceName} · ${dataset.materialName}` : '未加载数据，请放样例开始'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={loadSample}
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-all duration-200 border border-slate-700 hover:border-slate-500"
        >
          <Database className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
          <span>放样例</span>
        </button>

        <button
          onClick={startRerun}
          disabled={!dataset || isRerunning}
          className={cn(
            'group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
            dataset && !isRerunning
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-500'
              : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
          )}
        >
          <RefreshCw
            className={cn(
              'w-4 h-4 transition-all',
              isRerunning && 'animate-spin text-cyan-400',
              !isRerunning && dataset && 'group-hover:text-cyan-400'
            )}
          />
          <span>{isRerunning ? `重跑中 ${rerunProgress}%` : '重跑'}</span>
        </button>

        <button
          onClick={() => setSummaryOpen(true)}
          disabled={!dataset}
          className={cn(
            'group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
            dataset
              ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white border-transparent shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40'
              : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
          )}
        >
          <Scroll className="w-4 h-4" />
          <span>查看摘要</span>
        </button>
      </div>
    </div>
  );
}
