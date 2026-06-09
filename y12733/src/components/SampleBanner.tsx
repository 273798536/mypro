import { Sparkles, X } from 'lucide-react';
import { useCondProbStore } from '@/store/useCondProbStore';

export default function SampleBanner() {
  const { showSampleBanner, dismissSampleBanner, resetToSample, params } = useCondProbStore();
  if (!showSampleBanner) return null;

  return (
    <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 shadow-sm animate-fadeIn">
      <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0 border border-blue-200">
        <Sparkles className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 text-sm">
        <p className="font-medium text-ink-800">已载入示例数据 · 共 {params.length} 条参数</p>
        <p className="text-xs text-ink-500 mt-0.5">
          包含可用 / 暂缓 / 需重采三种状态以及 2 条边界样例，可直接体验审核、修正与边界回看流程。
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => resetToSample()}
          className="px-3 py-1.5 rounded-md text-xs bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-medium transition-colors"
        >
          重置为示例
        </button>
        <button
          onClick={dismissSampleBanner}
          className="p-1.5 rounded-md text-ink-400 hover:text-ink-700 hover:bg-white/70 transition-colors"
          aria-label="关闭提示"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
