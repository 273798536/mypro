import { useWorkflowStore } from '../store';
import { formatDateTime } from '../utils';
import { Layers, Upload, Play, FileWarning } from 'lucide-react';

interface SidebarProps {
  onNavigate: (path: string) => void;
  currentPath: string;
}

export function Sidebar({ onNavigate, currentPath }: SidebarProps) {
  const { batches, selectedBatchId, selectBatch } = useWorkflowStore();

  const handleBatchClick = (batchId: string) => {
    selectBatch(batchId);
    onNavigate(`/batch/${batchId}`);
  };

  return (
    <aside className="w-72 h-full bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 text-cyan-500">
          <FileWarning size={22} />
          <h1 className="font-mono font-bold text-lg">训练日志异常聚类</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">AI/ML 工作流工具</p>
      </div>

      <div className="p-3 border-b border-slate-700">
        <button
          onClick={() => onNavigate('/')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
            currentPath === '/'
              ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30'
              : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          <Upload size={16} />
          批次管理首页
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium px-2 py-1 mb-2">
          <Layers size={14} />
          数据批次 ({batches.length})
        </div>
        <div className="space-y-2">
          {batches.map((batch) => {
            const isSelected = selectedBatchId === batch.id;
            return (
              <div
                key={batch.id}
                onClick={() => handleBatchClick(batch.id)}
                className={`p-3 rounded cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/50'
                    : 'bg-slate-800/50 border-transparent hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm text-slate-100 font-medium truncate flex-1">
                    {batch.name}
                  </span>
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono shrink-0">
                    run × {batch.runCount}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5 font-mono truncate">
                  {batch.sourceFile}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-500">
                    {formatDateTime(batch.updatedAt)}
                  </span>
                  {batch.latestRunVersion && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                      v{batch.latestRunVersion}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {batches.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-8">
              暂无批次数据
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
