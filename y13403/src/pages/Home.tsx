import { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { SummaryPanel } from '@/components/SummaryPanel';
import { ImportPanel } from '@/components/ImportPanel';
import { RecordList } from '@/components/RecordList';
import { ComputationPanel } from '@/components/ComputationPanel';
import { ExceptionPanel } from '@/components/ExceptionPanel';
import { ToastStack } from '@/components/ToastStack';
import { Network, Moon, PanelsLeftRight, GitBranch, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { clsx } from 'clsx';

export default function Home() {
  const loadSummary = useApp((s) => s.loadSummary);
  const loadRecords = useApp((s) => s.loadRecords);
  const selectedId = useApp((s) => s.selectedId);
  const loadDetail = useApp((s) => s.loadDetail);
  const rightPanelMode = useApp((s) => s.rightPanelMode);
  const setRightPanelMode = useApp((s) => s.setRightPanelMode);

  useEffect(() => {
    loadSummary();
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="h-full w-full bg-surface-950 text-zinc-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise pointer-events-none" />
      <ToastStack />

      <div className="relative z-10 flex flex-col h-full">
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-sky-500/30 to-indigo-500/30 border border-sky-500/30 flex items-center justify-center">
              <Network className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide">拓扑路径边界复核</h1>
              <p className="text-[11px] text-zinc-500 font-mono">建模社 · 夜间复核工作台</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.02]">
              <GitBranch className="w-3 h-3 text-indigo-400" />
              <span className="text-[11px] text-zinc-300">复核员：阿乔</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Moon className="w-3.5 h-3.5" />
              <span>夜间模式</span>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3">
          <section className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-hidden">
            <SummaryPanel />
            <ImportPanel />
          </section>

          <section className="col-span-12 lg:col-span-5 min-h-0 overflow-hidden">
            <RecordList />
          </section>

          <section className="col-span-12 lg:col-span-4 min-h-0 overflow-hidden">
            <div className="h-full flex flex-col rounded-lg border border-white/10 bg-surface-800/60 shadow-card overflow-hidden">
              <div className="flex items-center border-b border-white/5">
                <button
                  onClick={() => setRightPanelMode(rightPanelMode === 'computation' ? null : 'computation')}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2',
                    rightPanelMode === 'computation' || !rightPanelMode
                      ? 'border-sky-400 text-sky-300'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  <PanelsLeftRight className="w-3.5 h-3.5" />
                  计算链路
                </button>
                <button
                  onClick={() => setRightPanelMode(rightPanelMode === 'exception' ? null : 'exception')}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2',
                    rightPanelMode === 'exception'
                      ? 'border-indigo-400 text-indigo-300'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  {rightPanelMode === 'exception' ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
                  异常处理
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                {rightPanelMode === 'exception' ? <ExceptionPanel /> : <ComputationPanel />}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
