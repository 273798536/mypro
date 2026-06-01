import { useAppStore } from '@/store/useAppStore';
import DataImport from '@/components/DataImport';
import DataTable from '@/components/DataTable';
import ResultPanel from '@/components/ResultPanel';
import PendingList from '@/components/PendingList';
import AnomalyList from '@/components/AnomalyList';
import ExportPanel from '@/components/ExportPanel';
import { FlaskConical, Thermometer, Info } from 'lucide-react';

export default function Home() {
  const { experiments, results, anomalies, isCalculating } = useAppStore();

  const statusCounts = experiments.reduce(
    (acc, exp) => {
      acc[exp.status] = (acc[exp.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const normalCount = results.filter((r) => !isNaN(r.thermalConductivity) && r.rSquared >= 0.95).length;
  const pendingCount = statusCounts['pending'] || 0;
  const anomalyCount = statusCounts['anomaly'] || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-slate-800 text-white shadow-lg border-b-4 border-primary-600">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  热传导材料比对工具
                </h1>
                <p className="text-slate-300 text-xs">
                  Thermal Conductivity Material Comparison
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="w-4 h-4 text-primary-300" />
                <span className="text-slate-300">导热率计算 · 曲线拟合 · 异常检测</span>
              </div>

              {isCalculating && (
                <div className="flex items-center gap-2 text-sm text-amber-300">
                  <div className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                  正在计算...
                </div>
              )}
            </div>
          </div>

          {experiments.length > 0 && (
            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-700 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">总实验数:</span>
                <span className="font-mono font-semibold text-white">
                  {experiments.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300">正常</span>
                <span className="font-mono text-emerald-400">{normalCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-300">待确认</span>
                <span className="font-mono text-amber-400">{pendingCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-slate-300">异常</span>
                <span className="font-mono text-red-400">{anomalyCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">已计算:</span>
                <span className="font-mono text-white">
                  {results.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">使用说明</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>
                  导入CSV文件（必须包含时间和温度列，可包含材料编号、厚度、边界温度）
                </li>
                <li>
                  在数据表格中补充缺失的材料编号、厚度、边界温度（点击单元格编辑）
                </li>
                <li>点击"批量计算"进行热传导分析和异常检测</li>
                <li>审核待确认清单中的数据，确认有效或标记为异常</li>
                <li>导出完整报告（包含正常结果、待确认、异常清单）</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <DataImport />
            <ExportPanel />
          </div>

          <div className="col-span-6 space-y-6">
            <div className="h-[400px]">
              <DataTable />
            </div>
            <div className="h-[500px]">
              <ResultPanel />
            </div>
          </div>

          <div className="col-span-3 space-y-6">
            <div className="h-[400px]">
              <PendingList />
            </div>
            <div className="h-[500px]">
              <AnomalyList />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 py-6 border-t border-slate-200 bg-white/50">
        <div className="max-w-[1600px] mx-auto px-6 text-center text-sm text-slate-500">
          <p>
            热传导材料比对工具 · 基于傅里叶定律的非稳态温升曲线拟合算法
          </p>
          <p className="text-xs mt-1 text-slate-400">
            数据自动保存在浏览器本地，清除浏览器数据会丢失历史记录
          </p>
        </div>
      </footer>
    </div>
  );
}
