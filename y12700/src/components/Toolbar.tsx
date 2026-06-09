import { Save, FilePlus, Sparkles, History, TestTube } from 'lucide-react';
import { useStore } from '@/store';
import ViewSwitcher from './ViewSwitcher';
import { Link } from 'react-router-dom';

export default function Toolbar() {
  const saveToHistory = useStore(s => s.saveToHistory);
  const clearMatrix = useStore(s => s.clearMatrix);
  const loadSample = useStore(s => s.loadSample);
  const rankResult = useStore(s => s.rankResult);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink-800 to-ink-600 flex items-center justify-center shadow-card">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold text-ink-800 leading-tight">
              矩阵秩退化诊断器
            </div>
            <div className="text-[11.5px] text-ink-400 leading-tight">
              公式 · 单位 · 异常 · 来源 一目了然
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ViewSwitcher />

        <div className="h-6 w-px bg-ink-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-1 bg-ink-50 rounded-xl p-1 border border-ink-100">
          <span className="text-[11px] text-ink-500 px-1.5 font-medium">示例</span>
          <button
            onClick={() => loadSample('rank-deficient')}
            className="text-[11.5px] px-2 py-1 rounded-md hover:bg-white text-ink-600 hover:text-ink-800"
            title="载入含秩亏+单位缺失的典型案例"
          >
            <TestTube className="w-3.5 h-3.5 inline mr-1" />
            秩亏案例
          </button>
          <button
            onClick={() => loadSample('near-singular')}
            className="text-[11.5px] px-2 py-1 rounded-md hover:bg-white text-ink-600 hover:text-ink-800"
          >
            接近奇异
          </button>
          <button
            onClick={() => loadSample('clean')}
            className="text-[11.5px] px-2 py-1 rounded-md hover:bg-white text-ink-600 hover:text-ink-800"
          >
            满秩参考
          </button>
        </div>

        <button onClick={clearMatrix} className="btn-ghost">
          <FilePlus className="w-4 h-4" />
          新建
        </button>

        <Link to="/history" className="btn-ghost">
          <History className="w-4 h-4" />
          历史对比
        </Link>

        <button onClick={saveToHistory} disabled={!rankResult} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
          <Save className="w-4 h-4" />
          存入历史
        </button>
      </div>
    </div>
  );
}
