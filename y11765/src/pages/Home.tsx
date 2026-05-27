import { useState } from 'react';
import { Zap, Save, Upload } from 'lucide-react';
import { MotorScene } from '../components/three/MotorScene';
import { ControlPanel } from '../components/panels/ControlPanel';
import { InfoPanel } from '../components/panels/InfoPanel';
import { useAppStore } from '../store/useAppStore';

export default function Home() {
  const { motorConfig, saveConfig } = useAppStore();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const handleCanvasReady = (canvasElement: HTMLCanvasElement) => {
    setCanvas(canvasElement);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="h-14 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">电机磁场剖面可视化</h1>
              <p className="text-slate-500 text-[10px">Motor Magnetic Field Visualizer</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={saveConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
          >
            <Save size={14} />
            保存配置
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600 transition-colors">
            <Upload size={14} />
            导入配置
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="flex-shrink-0 border-r border-slate-700">
          <ControlPanel />
        </aside>

        <main className="flex-1 relative min-w-0">
          <MotorScene config={motorConfig} onCanvasReady={handleCanvasReady} />
        </main>

        <aside className="flex-shrink-0 border-l border-slate-700">
          <InfoPanel canvas={canvas} />
        </aside>
      </div>

      <footer className="h-8 bg-slate-900/90 border-t border-slate-700 flex items-center justify-between px-4 text-xs text-slate-500 flex-shrink-0">
        <span>© 2026 机电教学可视化平台</span>
        <div className="flex items-center gap-4">
          <span>
            启用线圈: {motorConfig.coils.filter((c) => c.enabled).length} / {motorConfig.coils.length}
          </span>
          <span>
            转子角度: {motorConfig.rotorAngle}°</span>
          <span>
            剖面: {motorConfig.sectionPlane.visible ? '启用' : '禁用'}
          </span>
        </div>
      </footer>
    </div>
  );
}
