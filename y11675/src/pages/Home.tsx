import { useState } from 'react';
import { Scene3D } from '@/components/Scene3D';
import { ControlPanel } from '@/components/ControlPanel';
import { ValuePanel } from '@/components/ValuePanel';
import { Toolbar } from '@/components/Toolbar';
import { HistoryPanel } from '@/components/HistoryPanel';
import { Vec3 } from '@/types';

export default function Home() {
  const [selectedPoint, setSelectedPoint] = useState<Vec3 | null>(null);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />

        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <Scene3D onPointSelect={setSelectedPoint} />

            <div className="absolute top-4 left-4 pointer-events-none">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>拖拽电荷移动位置</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  <span>右键点击选取采样点</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span>鼠标滚轮缩放视角</span>
                </div>
              </div>
            </div>

            {selectedPoint && (
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
                <div className="text-slate-400">采样点位置</div>
                <div className="text-white font-mono">
                  ({selectedPoint.x.toFixed(2)}, {selectedPoint.y.toFixed(2)}, {selectedPoint.z.toFixed(2)})
                </div>
              </div>
            )}
          </div>

          <HistoryPanel />
        </div>

        <ValuePanel />
      </div>
    </div>
  );
}
