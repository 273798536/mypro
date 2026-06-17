import { Play, RefreshCw, Code2 } from 'lucide-react';
import { useBusinessStore } from '@/stores/useBusinessStore';
import { useApiStore } from '@/stores/useApiStore';
import * as apiSimulator from '@/utils/apiSimulator';

export default function TopBar() {
  const { complaints, applyStartResult, applyRerunResult, filters, isStarted, fieldMapping } =
    useBusinessStore();
  const { isLoading, setLoading, appendLog, setShowDrawer, setDrawerTab } = useApiStore();

  const totalCount = complaints.length;
  const abnormalCount = complaints.filter((c) => c.coordIssue).length;
  const mergeSuggestionCount = useBusinessStore((s) => s.mergeSuggestions).length;

  const handleStart = async () => {
    setLoading(true);
    const result = await apiSimulator.start(fieldMapping);
    applyStartResult(result);
    result.logs.forEach((log) => appendLog(log));
    setLoading(false);
  };

  const handleRerun = async () => {
    setLoading(true);
    const result = await apiSimulator.rerun(filters, complaints);
    applyRerunResult(result);
    result.logs.forEach((log) => appendLog(log));
    setLoading(false);
  };

  const handleViewApi = () => {
    setDrawerTab('view');
    setShowDrawer(true);
  };

  return (
    <div className="h-16 bg-panel-blue border-b border-white/10 px-6 flex items-center justify-between shadow-panel">
      <h1 className="text-amber-warn font-mono text-2xl tracking-wider">
        公园噪声公示清单
      </h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 mr-4">
          <span className="text-xs text-white/60 bg-space-deep px-3 py-1.5 rounded-sm border border-white/10">
            投诉总数 <span className="text-white font-mono ml-1">{totalCount}</span>
          </span>
          <span className="text-xs text-red-reject bg-space-deep px-3 py-1.5 rounded-sm border border-red-reject/30">
            异常 <span className="font-mono ml-1">{abnormalCount}</span>
          </span>
          <span className="text-xs text-purple-merge bg-space-deep px-3 py-1.5 rounded-sm border border-purple-merge/30">
            归并建议 <span className="font-mono ml-1">{mergeSuggestionCount}</span>
          </span>
        </div>

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-amber-warn text-amber-warn hover:bg-amber-warn/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors"
        >
          <Play size={16} />
          {isStarted ? '重启' : '启动'}
        </button>

        <button
          onClick={handleRerun}
          disabled={isLoading || !isStarted}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-cyan-glow text-cyan-glow hover:bg-cyan-glow/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          重跑
        </button>

        <button
          onClick={handleViewApi}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-green-ok text-green-ok hover:bg-green-ok/10 rounded-sm transition-colors"
        >
          <Code2 size={16} />
          查看接口返回
        </button>
      </div>
    </div>
  );
}
