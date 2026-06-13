import { Toolbar } from '@/components/Toolbar';
import { SpeckleChart } from '@/components/SpeckleChart';
import { VersionTimeline } from '@/components/VersionTimeline';
import { AnomalyDrawer } from '@/components/AnomalyDrawer';
import { SummaryModal } from '@/components/SummaryModal';
import { useSpeckleStore } from '@/store/useSpeckleStore';
import { useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';

export default function Home() {
  const dataset = useSpeckleStore((s) => s.dataset);
  const loadSample = useSpeckleStore((s) => s.loadSample);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!useSpeckleStore.getState().dataset) {
        /* auto-load disabled, wait for user */
      }
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.05),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <Toolbar />

        {dataset ? (
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <SpeckleChart />

              <div className="px-6 pb-4">
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-3 flex items-start gap-3">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-300 font-medium">使用提示：</span>
                    点击图表上的橙色异常点可查看追溯详情（影响范围、来源行、材料证据）；顶部「重跑」模拟参数重新计算；「查看摘要」可一键导出复核结论。
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[360px] shrink-0 border-l border-slate-800/60 bg-slate-900/30">
              <VersionTimeline />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="max-w-xl w-full rounded-3xl bg-slate-900/60 border border-slate-800 p-10 text-center backdrop-blur-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-cyan-400/30 border border-indigo-400/20 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-cyan-300" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">准备开始激光散斑参数回放</h2>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                该工具用于复核激光散斑检测数据的可追溯性，支持异常点一键回看原始材料、版本变更留痕、复核摘要一键导出。
              </p>
              <button
                onClick={loadSample}
                className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all duration-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" strokeLinecap="round" />
                  <path d="M7 15l4-4 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                加载演示样例
              </button>
              <div className="mt-8 grid grid-cols-3 gap-3 text-left">
                {[
                  { t: '放样例', d: '一键加载演示数据' },
                  { t: '重跑', d: '模拟参数重算流程' },
                  { t: '摘要', d: '查看/导出复核结论' },
                ].map((i) => (
                  <div key={i.t} className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-3">
                    <div className="text-xs font-semibold text-slate-200 mb-0.5">{i.t}</div>
                    <div className="text-[11px] text-slate-500">{i.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <AnomalyDrawer />
        <SummaryModal />
      </div>
    </div>
  );
}
