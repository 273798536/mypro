import { Download, Activity, BarChart3, Beaker, ChevronRight } from 'lucide-react';
import { useFitStore } from '../hooks/useFitStore';
import { getModelById } from '../utils/models';
import { generateTextReport, downloadTextReport } from '../utils/export';
import DataInput from '../components/DataInput';
import FitChart from '../components/FitChart';
import ResidualChart from '../components/ResidualChart';
import DiagnosisPanel from '../components/DiagnosisPanel';
import ParameterTable from '../components/ParameterTable';
import Latex from '../components/Latex';

export default function Home() {
  const { fitResult, diagnosis, residualAnalysis, boundaryTouch, selectedModelId, xData, yData } =
    useFitStore();

  const model = getModelById(selectedModelId);

  const handleExport = () => {
    if (!fitResult || !model || !diagnosis) return;
    const report = generateTextReport(
      model,
      fitResult,
      diagnosis,
      residualAnalysis,
      boundaryTouch,
      xData,
      yData
    );
    downloadTextReport(report, `fit-diagnosis-${Date.now()}.txt`);
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-zinc-200">
      <header className="border-b border-zinc-800/60 bg-[#0d0f1a]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Beaker className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100 tracking-wide">
                曲线拟合异常诊断
              </h1>
              <p className="text-[10px] text-zinc-500">
                CurveFit Diagnostics
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={!fitResult || !diagnosis}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出报告
          </button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-3 space-y-5">
            <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
              <DataInput />
            </div>
          </aside>

          <section className="col-span-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-medium text-zinc-300">拟合曲线</h2>
                {model && (
                  <div className="ml-auto text-xs text-zinc-600 overflow-hidden">
                    <Latex formula={model.latexFormula} displayMode={false} />
                  </div>
                )}
              </div>
              <FitChart />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-medium text-zinc-300">残差分析</h2>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-600">辅助解释</span>
              </div>
              <ResidualChart />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-zinc-600">参数边界</span>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-600">辅助解释</span>
              </div>
              <ParameterTable />
            </div>
          </section>

          <aside className="col-span-4">
            <div className="sticky top-20 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`w-2 h-2 rounded-full ${
                    diagnosis?.status === 'pass'
                      ? 'bg-emerald-400'
                      : diagnosis?.status === 'warning'
                      ? 'bg-amber-400'
                      : diagnosis?.status === 'fail'
                      ? 'bg-red-400'
                      : 'bg-zinc-600'
                  }`}
                />
                <h2 className="text-sm font-medium text-zinc-300">异常诊断</h2>
              </div>
              <DiagnosisPanel />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
