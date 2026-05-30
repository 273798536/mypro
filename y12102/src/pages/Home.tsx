import { Toolbar } from '../components/Toolbar';
import { ScoreTable } from '../components/ScoreTable';
import { ResultPanel } from '../components/ResultPanel';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">矩阵评分一致性检查工具</h1>
            <p className="text-sm text-slate-300 mt-0.5">
              专业的评委打分分析与一致性检验平台
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              系统就绪
            </span>
          </div>
        </div>
      </header>

      <Toolbar />

      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <h2 className="font-semibold text-slate-700 text-sm">数据编辑区</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScoreTable />
          </div>
        </div>

        <div className="w-1/2 bg-slate-50 flex flex-col">
          <div className="px-4 py-2 bg-white border-b border-slate-200">
            <h2 className="font-semibold text-slate-700 text-sm">分析结果区</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ResultPanel />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-xs text-slate-500 flex items-center justify-between">
        <span>© 2024 绩效分析工具 | 权重矩阵计算与一致性检验系统</span>
        <div className="flex items-center gap-4">
          <span>提示：点击"运行计算"开始分析，可导出完整报告</span>
        </div>
      </footer>
    </div>
  );
}
