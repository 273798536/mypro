import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Upload, 
  BarChart3, 
  GitCompare, 
  RefreshCw, 
  FileOutput, 
  Menu, 
  X,
  AlertCircle
} from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';

const navItems = [
  { path: '/', label: '数据导入台', icon: Upload },
  { path: '/valuation', label: '估值工作台', icon: BarChart3 },
  { path: '/changes', label: '变更追踪器', icon: RefreshCw },
  { path: '/compare', label: '修正对比室', icon: GitCompare },
  { path: '/export', label: '导出中心', icon: FileOutput },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const unresolvedConflicts = useValuationStore((state) => 
    state.conflicts.filter((c) => !c.resolved).length
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-primary-700 to-primary-800 shadow-lg z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-gold rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-800" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">基金投后估值备忘</h1>
                <p className="text-primary-200 text-xs">专业估值管理系统</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {unresolvedConflicts > 0 && (
              <Link
                to="/changes"
                className="flex items-center gap-2 px-3 py-1.5 bg-danger/90 hover:bg-danger rounded-lg transition-colors"
              >
                <AlertCircle className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">{unresolvedConflicts} 个待处理</span>
              </Link>
            )}
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">管</span>
            </div>
          </div>
        </div>
      </header>

      <aside
        className={`fixed top-16 left-0 bottom-0 bg-white shadow-lg transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
        }`}
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.path === '/changes' && unresolvedConflicts > 0 && (
                  <span className="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full">
                    {unresolvedConflicts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'ml-56' : 'ml-0'
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
