import { useState } from 'react';
import SummaryPanel from './components/SummaryPanel';
import FilterBar from './components/FilterBar';
import RecordList from './components/RecordList';
import RecordDetail from './components/RecordDetail';
import ReportPanel from './components/ReportPanel';

type ViewMode = 'detail' | 'report';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('detail');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-bond-500 to-bond-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">绿色债券募集款风险预警</h1>
                <p className="text-xs text-slate-500">
                  资金主管工作台 · 撤回记录与最终结论关联 · 历史判断完整留存 · Markdown 报告一键沟通
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 rounded-lg p-0.5 flex">
                <button
                  onClick={() => setViewMode('detail')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    viewMode === 'detail'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  明细审查
                </button>
                <button
                  onClick={() => setViewMode('report')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    viewMode === 'report'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Markdown 报告
                </button>
              </div>
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center text-white text-sm font-medium">
                  敏
                </div>
                <div className="text-sm">
                  <div className="text-slate-800 font-medium">阿敏</div>
                  <div className="text-xs text-slate-500">资金主管</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {viewMode === 'detail' ? (
          <>
            <SummaryPanel />
            <FilterBar />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: 'calc(100vh - 280px)' }}>
              <div className="lg:col-span-3">
                <RecordList />
              </div>
              <div className="lg:col-span-2">
                <RecordDetail />
              </div>
            </div>
          </>
        ) : (
          <>
            <SummaryPanel />
            <FilterBar />
            <div style={{ minHeight: 'calc(100vh - 280px)' }}>
              <ReportPanel />
            </div>
          </>
        )}
      </main>

      <footer className="max-w-[1600px] mx-auto px-6 py-4 border-t border-slate-200 mt-8">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>筛选条件、人工备注、撤回结论、Markdown 报告均已持久化至 localStorage，刷新页面后不会丢失。</div>
          <div>© 2026 绿色债券募集款风险预警系统</div>
        </div>
      </footer>
    </div>
  );
}
