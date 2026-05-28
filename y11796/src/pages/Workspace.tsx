import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Scene3D from '@/components/View3D/Scene';
import Chart2D from '@/components/Chart2D';
import ControlPanel from '@/components/ControlPanel';
import Sidebar from '@/components/Sidebar';
import ReportModal from '@/components/ReportModal';
import { Zap, Info } from 'lucide-react';

export default function Workspace() {
  const {
    initFromStorage,
    setShowReportModal,
    showReportModal,
    params,
    result,
    isSimulating,
    toggleSimulation,
    resetSimulation,
    simulationTime,
    setSimulationTime,
  } = useStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <div className="w-screen h-screen bg-[#0A0E17] text-white overflow-hidden flex flex-col">
      <header className="h-14 flex items-center justify-between px-6 border-b border-gray-800/50 bg-[#0F141F]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Zap size={18} className="text-black" />
          </div>
          <div>
            <h1 className="text-cyan-400 font-mono font-bold text-sm">RC充放电课堂API</h1>
            <p className="text-[10px] text-gray-600 font-mono">Capacitance Charge-Discharge Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {result && (
            <div className="hidden md:flex items-center gap-6 text-xs font-mono">
              <div className="text-center">
                <div className="text-gray-500">τ =</div>
                <div className="text-cyan-400">{result.timeConstant.toFixed(4)} s</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Vc(t) =</div>
                <div className="text-green-400">
                  {result.chargeCurve.length > 0 
                    ? result.chargeCurve[Math.min(
                        Math.floor(simulationTime * params.samplePoints / params.timeRange),
                        result.chargeCurve.length - 1
                      )]?.voltage.toFixed(4) 
                    : '0.0000'} V
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">t =</div>
                <div className="text-orange-400">{simulationTime.toFixed(3)} {params.timeUnit}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={resetSimulation}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-mono transition-colors"
            >
              重置
            </button>
            <button
              onClick={toggleSimulation}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-all ${
                isSimulating
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400'
              }`}
            >
              {isSimulating ? '暂停' : '播放'}
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black text-xs font-mono hover:from-green-400 hover:to-emerald-400 transition-all"
            >
              报告
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-72 p-3 flex-shrink-0">
          <ControlPanel />
        </div>

        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
          <div className="flex-1 min-h-0 relative">
            <Scene3D />
            
            {result && result.warnings.length > 0 && (
              <div className="absolute top-3 left-3 right-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
                <div className="flex items-start gap-2 text-xs">
                  <Info size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-yellow-400 font-mono mb-1">检测到 {result.warnings.length} 个异常</div>
                    <div className="text-yellow-300/80 text-[10px] font-mono">
                      {result.warnings[0].message}
                      {result.warnings.length > 1 && ` ...还有 ${result.warnings.length - 1} 项`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-64 flex-shrink-0">
            <Chart2D />
          </div>
        </div>

        <div className="w-80 p-3 flex-shrink-0">
          <Sidebar />
        </div>
      </main>

      <footer className="h-8 flex items-center justify-between px-6 border-t border-gray-800/50 bg-[#0F141F]/50">
        <div className="text-[10px] text-gray-600 font-mono">
          R={params.resistance}{params.resistanceUnit} · C={params.capacitance}{params.capacitanceUnit} · Vs={params.sourceVoltage}{params.voltageUnit} · V0={params.initialVoltage}{params.voltageUnit}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">
          RC Charged-Discharge API v1.0 · 指数模型 · τ = R×C
        </div>
      </footer>

      {showReportModal && <ReportModal />}
    </div>
  );
}
