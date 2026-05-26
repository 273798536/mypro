import { useEffect } from 'react';
import { Scene3D } from '../components/Scene3D/Scene3D';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { TimeSlider } from '../components/TimeControl/TimeSlider';
import { TopBar } from '../components/TopBar/TopBar';
import { useAppStore } from '../store/useAppStore';
import { Building, Playground } from '../types';

export function MainPage() {
  const { recalculateSunlightStats } = useAppStore();

  useEffect(() => {
    recalculateSunlightStats();
  }, [recalculateSunlightStats]);

  const handleBuildingClick = (building: Building) => {
    console.log('Clicked building:', building);
  };

  const handlePlaygroundClick = (playground: Playground) => {
    console.log('Clicked playground:', playground);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden pt-14 pb-28">
        <div 
          id="scene-container"
          className="flex-1 relative"
        >
          <Scene3D
            onBuildingClick={handleBuildingClick}
            onPlaygroundClick={handlePlaygroundClick}
          />
          
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 text-xs text-slate-300">
            <div className="font-medium text-white mb-2">操作提示</div>
            <div className="space-y-1">
              <div>🖱️ 左键拖动 - 旋转视角</div>
              <div>🖱️ 滚轮 - 缩放</div>
              <div>🖱️ 右键拖动 - 平移</div>
              <div>🎯 点击场地 - 查看详情</div>
            </div>
          </div>
        </div>
        
        <SidePanel />
      </div>
      
      <TimeSlider />
    </div>
  );
}
