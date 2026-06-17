import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Wrench,
  FileDown,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/overview', label: '检查概览', icon: LayoutDashboard },
  { to: '/anomaly/AN-001', label: '异常详情', icon: AlertTriangle },
  { to: '/correction', label: '人工修正', icon: Wrench },
  { to: '/export', label: '报告导出', icon: FileDown },
];

export default function Layout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-sand-50">
      <aside className="w-60 shrink-0 bg-brand-500 text-white flex flex-col">
        <div className="px-6 py-6 border-b border-brand-600">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-100" />
            <span className="font-serif text-lg tracking-wide">训练切分隔离检查</span>
          </div>
          <p className="text-xs text-brand-200 mt-1">数据质量核验 · 安全审核员友好</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAnomalyActive =
              item.to.startsWith('/anomaly') && loc.pathname.startsWith('/anomaly');
            const isActive = loc.pathname === item.to || isAnomalyActive;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 text-sm transition-colors border-l-4',
                  isActive
                    ? 'bg-brand-600 border-amber-400 text-white'
                    : 'border-transparent text-brand-100 hover:bg-brand-600 hover:text-white',
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-brand-600 text-xs text-brand-200">
          <p>版本 v1.0.0</p>
          <p className="mt-1">今天 2026-06-17</p>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
