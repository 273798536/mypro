import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { CreditDashboard from '@/pages/Dashboard';
import SampleDetail from '@/pages/SampleDetail';
import SuspendedList from '@/pages/SuspendedList';
import { initializeStore } from '@/store/useAppStore';
import { LayoutDashboard, FileWarning, BarChart3 } from 'lucide-react';

export default function App() {
  useEffect(() => {
    initializeStore();
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <header className="bg-gradient-navy text-white border-b border-navy-700">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-amber-400" />
          <h1 className="font-serif text-2xl font-bold tracking-wide">
            信贷评分指标看板
          </h1>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-navy-100 hover:bg-navy-700 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm font-medium">指标看板</span>
          </Link>
          <Link
            to="/suspended"
            className="flex items-center gap-2 px-4 py-2 text-navy-100 hover:bg-navy-700 transition-colors"
          >
            <FileWarning className="w-4 h-4" />
            <span className="text-sm font-medium">挂起管理</span>
          </Link>
        </nav>
      </div>
    </header>

    <main className="flex-1">
      <Routes>
        <Route path="/" element={<CreditDashboard />} />
        <Route path="/sample/:id" element={<SampleDetail />} />
        <Route path="/suspended" element={<SuspendedList />} />
      </Routes>
    </main>

    <footer className="bg-navy-50 border-t border-navy-200 py-4">
      <div className="container mx-auto px-6">
        <p className="text-center text-navy-500 text-xs">
          信贷评分指标看板 · 数据截止：2025-06-18 · 版本 v2.1.0
        </p>
      </div>
    </footer>
      </div>
    </Router>
  );
}
