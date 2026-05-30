import { useEffect, useState } from 'react';
import { Map, GitCompare, RefreshCw } from 'lucide-react';
import { useRiskStore } from '../store/useRiskStore';
import { ThreeScene } from '../components/three/Scene';
import { Sidebar } from '../components/layout/Sidebar';
import { InfoPanel } from '../components/layout/InfoPanel';
import { Timeline } from '../components/layout/Timeline';

export const Index = () => {
  const initData = useRiskStore((state) => state.initData);
  const compareMode = useRiskStore((state) => state.compareMode);
  const enterCompareMode = useRiskStore((state) => state.enterCompareMode);
  const exitCompareMode = useRiskStore((state) => state.exitCompareMode);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initData();
    setIsInitialized(true);
  }, [initData]);

  const handleReinit = () => {
    initData();
  };

  if (!isInitialized) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-bg-primary overflow-hidden">
      <header className="h-14 flex items-center justify-between px-6 border-b border-border-glow panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
            <Map className="text-bg-primary" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary font-mono">金融风险地形图</h1>
            <p className="text-xs text-text-muted">Financial Risk Topography System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReinit}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors text-sm"
          >
            <RefreshCw size={14} />
            重新生成
          </button>
          <button
            onClick={compareMode ? exitCompareMode : enterCompareMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              compareMode
                ? 'bg-accent-blue text-bg-primary'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            }`}
          >
            <GitCompare size={14} />
            {compareMode ? '退出对比' : '对比模式'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 relative">
          {compareMode ? (
            <div className="w-full h-full flex">
              <div className="flex-1 relative border-r border-border-glow">
                <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-bg-secondary/80 rounded text-xs text-text-primary font-semibold">
                  修正前
                </div>
                <ThreeScene />
              </div>
              <div className="flex-1 relative">
                <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-bg-secondary/80 rounded text-xs text-text-primary font-semibold">
                  修正后
                </div>
                <ThreeScene />
              </div>
            </div>
          ) : (
            <ThreeScene />
          )}
          <Timeline />
        </main>

        <InfoPanel />
      </div>
    </div>
  );
};
