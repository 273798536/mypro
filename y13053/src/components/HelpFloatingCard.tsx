import { HelpCircle, Play, RotateCcw, FileSpreadsheet, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function HelpFloatingCard() {
  const { helpExpanded, toggleHelp, resetToDemo, toggleCsvModal } = useAppStore();

  const copyUrl = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-40 w-72">
      <div className={`rounded-lg border border-ocean-200 bg-white/80 backdrop-blur-md shadow-lg transition-all duration-300 overflow-hidden ${helpExpanded ? '' : ''}`}>
        <button
          onClick={toggleHelp}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-ocean-600 text-white hover:bg-ocean-700 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="font-serif font-semibold text-sm">操作说明</span>
          <div className="flex-1" />
          {helpExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        {helpExpanded && (
          <div className="p-3 space-y-2 animate-fadeIn">
            <button
              onClick={resetToDemo}
              className="w-full flex items-center gap-2.5 p-2 rounded border border-ocean-100 hover:bg-ocean-50 text-left transition-colors group"
            >
              <span className="w-7 h-7 rounded bg-ocean-100 flex items-center justify-center group-hover:bg-ocean-600 group-hover:text-white transition-colors">
                <Play className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="text-sm font-medium text-ocean-700">放样例</div>
                <div className="text-[11px] text-ocean-400">重置筛选，加载演示数据包</div>
              </div>
            </button>
            <button
              onClick={resetToDemo}
              className="w-full flex items-center gap-2.5 p-2 rounded border border-ocean-100 hover:bg-ocean-50 text-left transition-colors group"
            >
              <span className="w-7 h-7 rounded bg-ocean-100 flex items-center justify-center group-hover:bg-ocean-600 group-hover:text-white transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="text-sm font-medium text-ocean-700">重跑</div>
                <div className="text-[11px] text-ocean-400">刷新当前筛选条件下的展示</div>
              </div>
            </button>
            <button
              onClick={toggleCsvModal}
              className="w-full flex items-center gap-2.5 p-2 rounded border border-ocean-100 hover:bg-ocean-50 text-left transition-colors group"
            >
              <span className="w-7 h-7 rounded bg-ocean-100 flex items-center justify-center group-hover:bg-ocean-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="text-sm font-medium text-ocean-700">查看CSV明细</div>
                <div className="text-[11px] text-ocean-400">弹窗浏览原始行，支持复制与下载</div>
              </div>
            </button>
            <div className="pt-2 border-t border-ocean-100">
              <button
                onClick={copyUrl}
                className="w-full flex items-center gap-2 p-2 rounded text-xs text-ocean-500 hover:bg-ocean-50 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>复制当前链接（截图讨论后可回源）</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
