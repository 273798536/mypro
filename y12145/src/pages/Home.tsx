import { ThreeScene } from '@/components/three/Scene';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { CalculationPanel } from '@/components/ui/CalculationPanel';
import { ValidationPanel } from '@/components/ui/ValidationPanel';
import { Timeline } from '@/components/ui/Timeline';
import { ChartPanel } from '@/components/ui/ChartPanel';
import { Sun, Rocket, Info } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                太阳帆轨道加速器
              </h1>
              <p className="text-xs text-slate-400">Solar Sail Orbital Accelerator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sun className="w-4 h-4 text-yellow-500" />
              <span>光压驱动演示系统</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
              <Info className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-slate-300">v1.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
          <div className="col-span-8 flex flex-col gap-4">
            <div className="flex-1 rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50">
              <ThreeScene />
            </div>
            <Timeline />
            <ChartPanel />
          </div>

          <div className="col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <ControlPanel />
            <CalculationPanel />
            <ValidationPanel />
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.8);
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4aa, #06b6d4);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 212, 170, 0.4);
          transition: transform 0.2s;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4aa, #06b6d4);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 212, 170, 0.4);
        }
      `}</style>
    </div>
  );
}
