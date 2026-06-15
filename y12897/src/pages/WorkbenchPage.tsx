import { useEffect } from 'react';
import { Scene3D } from '@/components/scene/Scene3D';
import { LeftPanel } from '@/components/panels/LeftPanel';
import { RightPanel } from '@/components/panels/RightPanel';
import { TopToolbar } from '@/components/TopToolbar';
import { Timeline } from '@/components/Timeline';
import { useProcessStore } from '@/stores';

export function WorkbenchPage() {
  const { runProcessing, isProcessing, records } = useProcessStore();

  useEffect(() => {
    if (records.length === 0 && !isProcessing) {
      runProcessing();
    }
  }, [records.length, isProcessing, runProcessing]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <TopToolbar />

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />

        <div className="flex-1 relative">
          <Scene3D />

          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="px-3 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-400">坐标参考</p>
              <p className="text-sm text-slate-200 font-mono">22.58°N, 113.92°E</p>
            </div>
          </div>

          <div className="absolute top-4 right-4 px-3 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-1">图例</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-400">浮标(在线)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-slate-400">浮标(离线)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-xs text-slate-400">船舶</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rotate-45 bg-orange-500" />
                <span className="text-xs text-slate-400">异常点</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-slate-400">养殖区</span>
              </div>
            </div>
          </div>
        </div>

        <RightPanel />
      </div>

      <Timeline />
    </div>
  );
}
