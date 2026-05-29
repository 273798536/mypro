import { useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { FilterPanel } from '@/components/FilterPanel/FilterPanel';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { PendingArea } from '@/components/PendingArea/PendingArea';
import { Canvas3D } from '@/components/Scene3D/Canvas3D';
import { Timeline } from '@/components/Scene3D/Timeline';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { initializeData } = useAppStore();

  useEffect(() => {
    initializeData(80, 200);
  }, [initializeData]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-deep-space">
      <div id="main-canvas" className="absolute inset-0">
        <Canvas3D className="w-full h-full" />
      </div>

      <Toolbar />
      <FilterPanel />
      <DetailPanel />
      <PendingArea />
      <Timeline />

      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
        <div className="glass-panel p-3 text-xs">
          <div className="text-[10px] mb-2 text-slate-400 font-mono">节点图例</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-neon-green" />
              <span className="text-slate-300">低风险</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-slate-300">中风险</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-slate-300">高风险</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rotate-45 bg-pink-500" />
              <span className="text-slate-300">中转地址</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-slate-300">待确认</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-3 text-xs">
          <div className="text-[10px] mb-2 text-slate-400 font-mono">链类型</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-300">ETH</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-300">BTC</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-slate-300">SOL</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-slate-300">BSC</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-slate-300">Polygon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}