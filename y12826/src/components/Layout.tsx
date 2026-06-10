import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, FileText, FlaskConical, Activity } from 'lucide-react';

const navItems = [
  { path: '/', label: '审计看板', icon: LayoutDashboard },
  { path: '/review', label: '异常复核', icon: AlertTriangle },
  { path: '/report/batch-001', label: '审计报告', icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-200">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-700 rounded flex items-center justify-center">
              <Activity className="w-6 h-6 text-teal-100" />
            </div>
            <div>
              <h1 className="font-display text-lg text-teal-300">PPI Audit</h1>
              <p className="text-xs text-slate-500">蛋白互作网络审计</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path.split('/')[1] ? `/${item.path.split('/')[1]}` : item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-teal-900/50 text-teal-300 border-l-2 border-teal-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300 truncate">研究员 · 张博士</p>
              <p className="text-xs text-slate-500 truncate">药物研发部</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-6 backdrop-blur">
          <div className="text-sm text-slate-500">
            {location.pathname === '/' && '审计看板 / 质控概览'}
            {location.pathname === '/review' && '异常复核 / 异常样本列表'}
            {location.pathname.startsWith('/sample/') && '样本明细 / 详情查看'}
            {location.pathname.startsWith('/report/') && '审计报告 / 最终结论'}
            {location.pathname.startsWith('/batch/') && '批次明细 / 样本列表'}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
            系统运行中
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
