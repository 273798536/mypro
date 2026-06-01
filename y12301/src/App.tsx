import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Scene3D } from './components/Scene3D/Scene3D';
import { LeftPanel } from './components/Panel/LeftPanel';
import { RightPanel } from './components/Panel/RightPanel';
import { BottomPanel } from './components/Panel/BottomPanel';
import { TopBar } from './components/Panel/TopBar';

function App() {
  const runAnomalyDetection = useAppStore((state) => state.runAnomalyDetection);

  useEffect(() => {
    runAnomalyDetection();
  }, [runAnomalyDetection]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#050A14] flex flex-col">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <main className="flex-1 relative">
          <Scene3D />
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">鼠标左键</span>
              <span>旋转视角</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">鼠标右键</span>
              <span>平移视角</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">滚轮</span>
              <span>缩放</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">点击建筑</span>
              <span>选中/查看详情</span>
            </div>
          </div>
        </main>
        <RightPanel />
      </div>
      <BottomPanel />
    </div>
  );
}

export default App;
