
import { useEffect } from 'react';
import { Scene3D } from './components/Scene3D/Scene3D';
import { LeftPanel } from './components/Sidebar/LeftPanel';
import { RightPanel } from './components/Sidebar/RightPanel';
import { Toolbar } from './components/Toolbar/Toolbar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useDataStore } from './store/useDataStore';

function App() {
  const loadMockData = useDataStore(state => state.loadMockData);
  
  useEffect(() => {
    loadMockData();
  }, [loadMockData]);
  
  return (
    <div className="w-full h-screen bg-slate-950 overflow-hidden relative">
      <div className="absolute inset-0">
        <Scene3D />
      </div>
      
      <Toolbar />
      <LeftPanel />
      <RightPanel />
      <StatusBar />
      
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-slate-900/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-700/50">
          <span className="text-gray-400 text-xs">
            鼠标左键旋转 • 右键平移 • 滚轮缩放 • 点击对象查看详情
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;

