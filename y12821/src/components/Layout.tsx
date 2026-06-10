import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FlaskConical,
  ListChecks,
  History,
  FileBarChart,
  User,
  RotateCcw,
} from 'lucide-react';
import { useSampleStore } from '../store/useSampleStore';
import { OPERATORS } from '../../shared/types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { currentOperator, setCurrentOperator, resetStore, currentBatchNumber } = useSampleStore();

  const navItems = [
    { path: '/', label: '到期提醒', icon: ListChecks },
    { path: '/audit', label: '审计历史', icon: History },
    { path: '/report', label: '报告导出', icon: FileBarChart },
  ];

  const handleReset = () => {
    if (confirm('确定要重置所有数据吗？此操作不可恢复。')) {
      localStorage.removeItem('sample-storage');
      resetStore();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <header className="relative bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">菌株保藏到期提醒</h1>
                <p className="text-xs text-slate-500">批次：{currentBatchNumber}</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <select
                  value={currentOperator}
                  onChange={(e) => setCurrentOperator(e.target.value)}
                  className="text-sm bg-transparent border-none focus:ring-0 text-slate-700 font-medium cursor-pointer"
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="重置数据"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};
