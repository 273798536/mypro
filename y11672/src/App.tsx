import { useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { FilterPanel } from './components/panels/FilterPanel';
import { AlertPanel } from './components/panels/AlertPanel';
import { InfoTooltip } from './components/panels/InfoTooltip';
import { SimulationBar } from './components/panels/SimulationBar';
import { YardScene } from './components/three/YardScene';
import { useYardStore } from './store/useYardStore';
import './index.css';

function App() {
  const { initDemoData, isLoading } = useYardStore();

  useEffect(() => {
    initDemoData();
  }, [initDemoData]);

  return (
    <div className="h-screen w-screen bg-industrial-darker flex flex-col overflow-hidden">
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <FilterPanel />
        
        <div 
          id="yard-container"
          className="flex-1 relative bg-industrial-dark"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-industrial-darker">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-industrial-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-industrial-light text-sm">正在生成堆场数据...</p>
              </div>
            </div>
          ) : (
            <YardScene />
          )}
          
          <InfoTooltip />
          
          <div className="absolute top-4 left-4 bg-industrial-darker/80 backdrop-blur-sm rounded p-3 text-xs space-y-2 pointer-events-none">
            <div className="font-medium text-industrial-light mb-1">图例</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-industrial-gray" />
              <span className="text-industrial-gray">普通集装箱</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-industrial-blue" />
              <span className="text-industrial-gray">冷藏箱</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-industrial-red" />
              <span className="text-industrial-gray">危险品(高危)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-industrial-yellow" />
              <span className="text-industrial-gray">危险品(一般)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-industrial-green" />
              <span className="text-industrial-gray">待提箱</span>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4 text-xs text-industrial-gray bg-industrial-darker/60 px-3 py-2 rounded pointer-events-none">
            <p>鼠标拖拽: 旋转视角 | 滚轮: 缩放 | 点击箱位: 选中/查看详情</p>
          </div>
        </div>
        
        <AlertPanel />
      </div>
      
      <SimulationBar />
    </div>
  );
}

export default App;
