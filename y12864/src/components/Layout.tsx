import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Calendar, FileText, AlertTriangle, Download, Waves } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: '日程总览', icon: Calendar },
  { path: '/records', label: '采样记录', icon: FileText },
  { path: '/anomalies', label: '异常追踪', icon: AlertTriangle },
  { path: '/export', label: '报告导出', icon: Download }
];

const riskLevelLabel = (level: string): string => {
  switch (level) {
    case 'normal': return '顺利';
    case 'pending': return '待确认';
    case 'anomaly': return '异常';
    default: return level;
  }
};

const riskLevelColor = (level: string): string => {
  switch (level) {
    case 'normal': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'anomaly': return 'bg-rose-100 text-rose-800 border-rose-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export { riskLevelLabel, riskLevelColor };

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex-shrink-0 shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">滩涂贝类</h1>
              <p className="text-xs text-slate-400">采样日程管理</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(item => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            <p>本地数据库模式</p>
            <p className="mt-1">数据存储于 data/ 目录</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
