import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from '@/pages/Home';
import DataInput from '@/pages/DataInput';
import CurveView from '@/pages/CurveView';
import ResultReport from '@/pages/ResultReport';
import AnomalyTrace from '@/pages/AnomalyTrace';
import { Home as HomeIcon, Database, LineChart, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '工作台', Icon: HomeIcon },
  { path: '/data-input', label: '数据录入', Icon: Database },
  { path: '/curve-view', label: '曲线展示', Icon: LineChart },
  { path: '/result-report', label: '结果报告', Icon: FileText },
  { path: '/anomaly-trace', label: '异常追溯', Icon: AlertTriangle },
];

function NavBar() {
  const location = useLocation();
  return (
    <nav className="bg-[#1e3a5f] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0d9488] rounded-lg flex items-center justify-center">
              <LineChart size={20} />
            </div>
            <span className="font-bold text-lg">溶解度曲线教学器</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map(({ path, label, Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-[#0d9488] text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/data-input" element={<DataInput />} />
            <Route path="/curve-view" element={<CurveView />} />
            <Route path="/result-report" element={<ResultReport />} />
            <Route path="/anomaly-trace" element={<AnomalyTrace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
