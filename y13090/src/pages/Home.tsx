import { useEffect, useRef } from 'react';
import { Construction, HardHat, AlertTriangle } from 'lucide-react';
import { StatsCards } from '@/components/StatsCards';
import { FilterBar } from '@/components/FilterBar';
import { RecordsTable } from '@/components/RecordsTable';
import { ScreenshotPanel } from '@/components/ScreenshotPanel';
import { AnomalyPanel } from '@/components/AnomalyPanel';
import { SnapshotBar } from '@/components/SnapshotBar';
import { QuickActions } from '@/components/QuickActions';
import { Scene3D, type Scene3DHandle } from '@/components/Scene3D';
import { useReviewStore } from '@/store/reviewStore';

export default function Home() {
  const { loadSample, filteredResult } = useReviewStore();
  const sceneRef = useRef<Scene3DHandle>(null);

  useEffect(() => {
    loadSample();
  }, [loadSample]);

  return (
    <div className="min-h-screen bg-steel-900 bg-grid-pattern bg-grid-40">
      <div className="min-h-screen bg-gradient-to-br from-steel-900 via-steel-900/95 to-industrial-900/30">
        <header className="border-b border-steel-800 bg-steel-900/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-industrial-600 flex items-center justify-center">
                  <Construction className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-warning-500 border-2 border-steel-900 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-steel-100 tracking-wide flex items-center gap-2">
                  桥隧检修平台空间复核
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-industrial-600/20 text-industrial-300 border border-industrial-600/30">
                    BETA
                  </span>
                </h1>
                <p className="text-xs text-steel-500">
                  筛选条件 · 统计数字 · 明细表 · 截图说明 — 同一结果集生成
                </p>
              </div>

              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-steel-400">
                  <HardHat className="w-4 h-4 text-industrial-400" />
                  <span>教学老师：林姐</span>
                </div>
                <div className="h-5 w-px bg-steel-700" />
                <div className="flex items-center gap-2 text-xs text-steel-400">
                  <AlertTriangle className="w-4 h-4 text-warning-400" />
                  <span>算法值班人</span>
                </div>
                {filteredResult.stats.total > 0 && (
                  <>
                    <div className="h-5 w-px bg-steel-700" />
                    <div className="text-xs font-mono text-steel-400">
                      结果集 <span className="text-industrial-400">#{Date.now().toString().slice(-6)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1800px] mx-auto px-6 py-6 space-y-5">
          <QuickActions />

          <StatsCards />

          <FilterBar />

          <SnapshotBar sceneRef={sceneRef} />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-5 flex flex-col gap-5 min-h-[600px]">
              <div className="flex-1 min-h-[340px]">
                <Scene3D ref={sceneRef} />
              </div>
              <div data-screenshot-panel className="flex-1 min-h-[260px]">
                <ScreenshotPanel />
              </div>
            </div>

            <div className="xl:col-span-7 flex flex-col gap-5 min-h-[600px]">
              <div className="flex-1 min-h-[340px]">
                <RecordsTable />
              </div>
              <div className="flex-1 min-h-[260px]">
                <AnomalyPanel />
              </div>
            </div>
          </div>

          <footer className="pt-2 pb-6 text-center text-[11px] text-steel-600">
            <p>桥隧检修平台空间复核 · 异常单独拎出 · 视图条件随截图保存</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
