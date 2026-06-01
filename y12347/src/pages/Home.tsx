import { useEffect } from 'react';
import { Atom, Beaker } from 'lucide-react';
import { DataInputSection } from '@/components/DataInputSection';
import { AnomalyPanel } from '@/components/AnomalyPanel';
import { FitResultSection } from '@/components/FitResultSection';
import { ChartSection } from '@/components/ChartSection';
import { ReportSection } from '@/components/ReportSection';
import { HistoryPanel } from '@/components/HistoryPanel';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { loadSampleData, dataPoints, fitResults } = useAppStore();

  useEffect(() => {
    if (dataPoints.length === 0 && fitResults.length === 0) {
      loadSampleData();
    }
  }, [dataPoints.length, fitResults.length, loadSampleData]);

  return (
    <div className="min-h-screen bg-lab-bg">
      <header className="border-b border-lab-border bg-lab-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-lab-info to-lab-accent rounded-lg flex items-center justify-center shadow-glow-info">
                <Atom className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-lab-text flex items-center gap-2">
                  放射衰变半衰期拟合
                  <span className="text-xs font-normal bg-lab-info/20 text-lab-info px-2 py-0.5 rounded">
                    v1.0
                  </span>
                </h1>
                <p className="text-xs text-lab-muted">
                  指数拟合 · 背景校正 · 异常检测
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-lab-muted">
              <Beaker size={16} />
              <span>核物理实验数据分析工具</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-[calc(100vh-7rem)]">
          <div className="xl:col-span-3 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              <DataInputSection />
            </div>
            <div className="flex-shrink-0">
              <AnomalyPanel />
            </div>
          </div>

          <div className="xl:col-span-5 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              <ChartSection />
            </div>
            <div className="flex-shrink-0">
              <FitResultSection />
            </div>
          </div>

          <div className="xl:col-span-4 flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              <ReportSection />
            </div>
            <div className="flex-shrink-0">
              <HistoryPanel />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-lab-border bg-lab-surface/50 py-3 mt-auto">
        <div className="container mx-auto px-4 text-center text-xs text-lab-muted">
          <p>
            ☢️ 请在专业人员指导下进行放射性实验 · 
            本工具仅供数据分析参考 · 
            重要结果请交叉验证
          </p>
        </div>
      </footer>
    </div>
  );
}
