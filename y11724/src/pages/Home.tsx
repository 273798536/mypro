import { useEffect } from 'react';
import FlightScene from '../components/FlightScene';
import ControlPanel from '../components/ControlPanel';
import DetailPanel from '../components/DetailPanel';
import { useCalcStore } from '../store/useCalcStore';

export default function Home() {
  const { recalculate } = useCalcStore();

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  return (
    <div className="h-screen w-screen flex bg-slate-950 overflow-hidden">
      <div className="w-80 flex-shrink-0">
        <ControlPanel />
      </div>
      
      <div className="flex-1 relative">
        <FlightScene />
        
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <h1 className="text-lg font-bold text-white">无人机电池续航试算</h1>
          <p className="text-xs text-slate-400">拖拽3D场景可旋转视角 · 调整左侧参数实时更新</p>
        </div>
      </div>
      
      <div className="w-96 flex-shrink-0">
        <DetailPanel />
      </div>
    </div>
  );
}
