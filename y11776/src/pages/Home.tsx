import { useEffect } from 'react';
import { useInterpolatorStore } from '../store/useInterpolatorStore';
import { FunctionSquare, Github, Info } from 'lucide-react';
import ControlPanel from '../components/ControlPanel';
import ChartArea from '../components/ChartArea';
import RightPanel from '../components/RightPanel';
import PresetModal from '../components/PresetModal';
import ReportModal from '../components/ReportModal';

export default function Home() {
  const { calculate, calculationResult } = useInterpolatorStore();

  useEffect(() => {
    if (!calculationResult) {
      calculate();
    }
  }, [calculate, calculationResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-primary-800/50 bg-primary-950/80 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <FunctionSquare className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-primary-100 leading-tight">
                多项式插值课堂器
              </h1>
              <p className="text-xs text-primary-500 font-mono">
                Polynomial Interpolation Classroom Tool
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-primary-500 hover:text-primary-300 hover:bg-primary-800/50 rounded-lg transition-colors">
              <Info size={18} />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-primary-500 hover:text-primary-300 hover:bg-primary-800/50 rounded-lg transition-colors"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
          {/* Left Panel - Control */}
          <div className="col-span-12 lg:col-span-3 xl:col-span-3 glass-panel p-4 overflow-hidden">
            <ControlPanel />
          </div>

          {/* Center - Chart */}
          <div className="col-span-12 lg:col-span-6 xl:col-span-6 glass-panel p-4 overflow-hidden">
            <ChartArea />
          </div>

          {/* Right Panel - History/Notes/Presets */}
          <div className="col-span-12 lg:col-span-3 xl:col-span-3 glass-panel p-4 overflow-hidden">
            <RightPanel />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-center text-xs text-primary-600">
          <p>
            💡 提示：拖拽滑块调整参数，观察高次插值在区间边缘的振荡现象（龙格现象）。
            异常数据会自动标记，不会混入正常计算结果。
          </p>
        </div>
      </main>

      {/* Modals */}
      <PresetModal />
      <ReportModal />
    </div>
  );
}
