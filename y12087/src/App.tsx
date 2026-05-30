import { useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { StatusBar } from '@/components/StatusBar';
import { FormulaList } from '@/components/SidebarLeft/FormulaList';
import { ParamsPanel } from '@/components/SidebarLeft/ParamsPanel';
import { SeedPoints } from '@/components/SidebarLeft/SeedPoints';
import { AnomalyTabs } from '@/components/SidebarRight/AnomalyTabs';
import { DetailList } from '@/components/SidebarRight/DetailList';
import { ChangeHistory } from '@/components/SidebarRight/ChangeHistory';
import { Scene } from '@/components/View3D/Scene';
import { ViewpointProvider } from '@/hooks/useViewpoint';
import { useUIStore } from '@/store/uiStore';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { useDetectionStore } from '@/store/detectionStore';
import { loadViewpoints, loadSeedPoints } from '@/utils/storage';
import { clsx } from '@/lib/utils';

function AppContent() {
  const leftSidebarOpen = useUIStore((s) => s.leftSidebarOpen);
  const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
  const isLoading = useUIStore((s) => s.isLoading);

  const initFromStorage = useVectorFieldStore((s) => s.initFromStorage);
  const setSavedViewpoints = useDetectionStore((s) => s.setSavedViewpoints);
  const setSeedPoints = useVectorFieldStore((s) => s.setSeedPoints);

  useEffect(() => {
    initFromStorage();

    const savedVPs = loadViewpoints();
    if (savedVPs && savedVPs.length > 0) {
      setSavedViewpoints(savedVPs);
    }

    const savedSeeds = loadSeedPoints();
    if (savedSeeds && savedSeeds.length > 0) {
      setSeedPoints(savedSeeds);
    }
  }, [initFromStorage, setSavedViewpoints, setSeedPoints]);

  return (
    <>
      <Toolbar />

      <div className="flex-1 flex relative overflow-hidden">
        <aside
          className={clsx(
            'h-full bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out z-30',
            'flex flex-col',
            leftSidebarOpen ? 'w-72' : 'w-0 opacity-0 pointer-events-none'
          )}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <FormulaList />
            <ParamsPanel />
            <SeedPoints />
          </div>
        </aside>

        <main className="flex-1 relative">
          <Scene />

          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-6 shadow-2xl text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">
                  正在计算...
                </h3>
                <p className="text-sm text-slate-400">
                  追踪流线和检测边界异常
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  重复运行 2 次以验证可重复性
                </p>
              </div>
            </div>
          )}
        </main>

        <aside
          className={clsx(
            'h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out z-30',
            'flex flex-col',
            rightSidebarOpen ? 'w-80' : 'w-0 opacity-0 pointer-events-none'
          )}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <AnomalyTabs />
            <DetailList />
            <ChangeHistory />
          </div>
        </aside>
      </div>

      <StatusBar />
    </>
  );
}

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <ViewpointProvider>
        <AppContent />
      </ViewpointProvider>
    </div>
  );
}
