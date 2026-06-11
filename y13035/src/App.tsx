import { Routes, Route } from 'react-router-dom';
import BatchList from './pages/BatchList';
import BatchDetail from './pages/BatchDetail';
import BatchHistory from './pages/BatchHistory';

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-primary-100">
        <div className="max-w-[1400px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-500 text-white flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 5-6" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-primary-900">港股通税费批次复核</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Hong Kong Stock Connect Tax Batch Review</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-emerald mr-1" />
            资金主管 · 阿敏
          </div>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <Routes>
          <Route path="/" element={<BatchList />} />
          <Route path="/batch/:id" element={<BatchDetail />} />
          <Route path="/batch/:id/history" element={<BatchHistory />} />
        </Routes>
      </main>
      <footer className="mt-16 border-t border-primary-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-8 py-6 text-xs text-zinc-500 flex justify-between">
          <span>© 2026 资金运营部 · 复核工作台</span>
          <span>启动 · 重跑 · 查看CSV明细</span>
        </div>
      </footer>
    </div>
  );
}
