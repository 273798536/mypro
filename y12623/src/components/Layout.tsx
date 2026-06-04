import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, AlertTriangle, Download, Database } from 'lucide-react';
import { useStore } from '../store/useStore';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { stats } = useStore();

  const navItems = [
    { path: '/', label: '网格吸附', icon: LayoutGrid, count: stats.pending + stats.approved + stats.rejected + stats.anomaly },
    { path: '/anomalies', label: '异常筛选', icon: AlertTriangle, count: stats.anomaly },
    { path: '/export', label: '导出复盘', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-industrial-600 rounded flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-mono text-lg font-semibold text-slate-900">物流月台装载草图</h1>
                <p className="text-xs text-slate-500">标注审核系统 v1.0</p>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors ${
                      isActive
                        ? 'bg-industrial-50 text-industrial-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        isActive ? 'bg-industrial-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  );
}
