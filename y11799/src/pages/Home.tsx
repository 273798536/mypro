import { useEffect, useRef } from 'react';
import { Flame, HelpCircle } from 'lucide-react';
import HeatPump3D from '@/components/HeatPump3D';
import ParameterPanel from '@/components/ParameterPanel';
import ResultPanel from '@/components/ResultPanel';
import RiskAlerts from '@/components/RiskAlerts';
import ScenarioManager from '@/components/ScenarioManager';
import ExportPanel from '@/components/ExportPanel';
import { useAppStore } from '@/store';

const Home = () => {
  const { recalculate } = useAppStore();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                热泵 COP 估算面板
              </h1>
              <p className="text-xs text-slate-400">Web3D 交互式能效分析工具</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <HelpCircle className="w-4 h-4" />
              帮助
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6" ref={mainRef}>
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          <div className="col-span-3 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              <ParameterPanel />
            </div>
          </div>

          <div className="col-span-6 flex flex-col gap-4 min-h-0">
            <div className="flex-1 bg-slate-800/30 rounded-xl overflow-hidden min-h-[400px]">
              <HeatPump3D />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <RiskAlerts />
              <ScenarioManager />
            </div>
          </div>

          <div className="col-span-3 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              <ResultPanel />
            </div>
            <ExportPanel targetRef={mainRef} />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-700/50 py-4 mt-6">
        <div className="container mx-auto px-4 flex items-center justify-between text-xs text-slate-500">
          <span>数据来源：内置机组参数库 + 各地区电价模板</span>
          <span>© 2024 暖通销售辅助工具 | 估算结果仅供参考</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
