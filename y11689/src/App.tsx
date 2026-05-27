import { useEffect, useCallback } from 'react';
import { Header } from './components/Layout/Header';
import { LeftPanel } from './components/Layout/LeftPanel';
import { RightPanel } from './components/Layout/RightPanel';
import { Timeline } from './components/Layout/Timeline';
import { BurnSurface } from './components/ThreeD/BurnSurface';
import { useProjectStore } from './store/useProjectStore';
import { useViewStore } from './store/useViewStore';
import { useRiskStore } from './store/useRiskStore';
import { exportAsImage } from './utils/exporter';

function App() {
  const loadData = useProjectStore((state) => state.loadData);
  const burnDataPoints = useProjectStore((state) => state.burnDataPoints);
  const expenses = useProjectStore((state) => state.expenses);
  const revenues = useProjectStore((state) => state.revenues);
  const milestones = useProjectStore((state) => state.milestones);
  const isLoaded = useProjectStore((state) => state.isLoaded);
  
  const isPlaying = useViewStore((state) => state.isPlaying);
  const setTimeSlice = useViewStore((state) => state.setTimeSlice);
  const timeSlice = useViewStore((state) => state.timeSlice);
  
  const detectRisks = useRiskStore((state) => state.detectRisks);
  const risks = useRiskStore((state) => state.risks);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isLoaded && burnDataPoints.length > 0) {
      detectRisks(expenses, revenues, milestones, burnDataPoints);
    }
  }, [isLoaded, burnDataPoints, expenses, revenues, milestones, detectRisks]);

  useEffect(() => {
    let interval: number | null = null;
    
    if (isPlaying) {
      interval = window.setInterval(() => {
        setTimeSlice((prev) => {
          if (prev >= 1) {
            return 0;
          }
          return prev + 0.002;
        });
      }, 50);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, setTimeSlice]);

  const handleExport = useCallback(() => {
    exportAsImage('main-canvas', 'cash-burn-surface');
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-deep-space via-midnight to-slate-dark">
      <Header onExport={handleExport} />
      
      <div className="flex-1 flex overflow-hidden relative">
        <LeftPanel />
        
        <main 
          id="main-canvas"
          className="flex-1 relative overflow-hidden"
        >
          {isLoaded ? (
            <BurnSurface 
              dataPoints={burnDataPoints} 
              risks={risks.filter(r => !r.resolved)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">加载数据中...</p>
              </div>
            </div>
          )}
          
          {isLoaded && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4">
              <div className="glass rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-slate-400">总预算</p>
                <p className="text-lg font-bold text-blue-400 font-mono">
                  ¥{burnDataPoints[burnDataPoints.length - 1]?.cumulativeBudget.toLocaleString() || '0'}
                </p>
              </div>
              <div className="glass rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-slate-400">已支出</p>
                <p className="text-lg font-bold text-orange-400 font-mono">
                  ¥{burnDataPoints[Math.floor(timeSlice * (burnDataPoints.length - 1))]?.cumulativeSpent.toLocaleString() || '0'}
                </p>
              </div>
              <div className="glass rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-slate-400">预计收入</p>
                <p className="text-lg font-bold text-green-400 font-mono">
                  ¥{burnDataPoints[Math.floor(timeSlice * (burnDataPoints.length - 1))]?.cumulativeRevenue.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          )}

          {isLoaded && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2">
              <p className="text-xs text-slate-400">
                进度: {(timeSlice * 100).toFixed(1)}% | 
                点击曲面查看数据详情 | 点击风险标记查看风险
              </p>
            </div>
          )}
        </main>
        
        <RightPanel />
      </div>
      
      <Timeline />
    </div>
  );
}

export default App;
