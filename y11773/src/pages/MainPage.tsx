import { Scene3D } from '../components/three/Scene3D';
import { ControlPanel } from '../components/ui/ControlPanel';
import { SensorPanel } from '../components/ui/SensorPanel';

export function MainPage() {
  return (
    <div id="main-container" className="flex h-screen bg-slate-950 overflow-hidden">
      <ControlPanel />
      <div className="flex-1 relative">
        <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-slate-950/80 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white font-['Orbitron'] tracking-widest">
                热辐射视角演示
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                拖动物体或调节参数，观察温度、面积、距离对辐射强度的影响
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500">物理公式</div>
                <div className="text-sm text-slate-300 font-mono">
                  I = εσT⁴A / 4πr²
                </div>
              </div>
            </div>
          </div>
        </header>

        <Scene3D />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
          <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700 text-xs text-slate-400">
            💡 提示：拖拽热源或传感器调整距离，使用滑块调节参数
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-slate-400">热源</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400">传感器</span>
          </div>
        </div>
      </div>
      <SensorPanel />
    </div>
  );
}
