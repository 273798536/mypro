import { useState, useEffect } from 'react';
import { FileText, RotateCcw, PlayCircle, Cpu } from 'lucide-react';
import { DiskParamsForm } from '../components/DiskParamsForm';
import { HangingMassForm } from '../components/HangingMassForm';
import { DataPointsTable } from '../components/DataPointsTable';
import { AnomalyBanner } from '../components/AnomalyBanner';
import { ResultCard } from '../components/ResultCard';
import { ChartSection } from '../components/ChartSection';
import { HistoryTimeline } from '../components/HistoryTimeline';
import { ReportModal } from '../components/ReportModal';
import { useExperimentStore } from '../store/useExperimentStore';

export default function Home() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const { loadSampleData, resetAll, calculate } = useExperimentStore();

  useEffect(() => {
    calculate();
  }, [calculate]);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-600 rounded-lg">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">刚体转动惯量测算系统</h1>
                <p className="text-xs text-slate-400">机械实验数据处理平台</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSampleData}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                加载示例
              </button>
              <button
                onClick={() => setReportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
              >
                <FileText className="w-4 h-4" />
                报告
              </button>
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="mb-6">
          <AnomalyBanner />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <DiskParamsForm />
            <HangingMassForm />
            <ResultCard />
          </div>

          <div className="lg:col-span-6 space-y-4">
            <DataPointsTable />
            <ChartSection />
          </div>

          <div className="lg:col-span-3">
            <div className="sticky top-24">
              <HistoryTimeline />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 text-center text-sm text-slate-500">
          <p>刚体转动惯量测算系统 - 基于刚体转动方程的精确计算</p>
          <p className="mt-1">支持单位换算、摩擦修正、异常检测、数据溯源</p>
        </div>
      </footer>

      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
    </div>
  );
}
