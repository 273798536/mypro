import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, GitBranch, GitCompare, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: '总览', icon: LayoutDashboard },
  { to: '/assign', label: '分派', icon: GitBranch },
  { to: '/compare', label: '对比', icon: GitCompare },
  { to: '/export', label: '导出', icon: Download },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-surface-700 bg-surface-800">
      <div className="flex h-16 items-center gap-2 border-b border-surface-700 px-6">
        <GitBranch className="h-6 w-6 text-brand-500" />
        <h1 className="text-lg font-semibold text-gray-100">网络流志愿者分派</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-500/15 text-brand-500'
                  : 'text-gray-400 hover:bg-surface-700 hover:text-gray-200'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-700 px-6 py-4">
        <p className="text-xs text-gray-500">v1.0.0 · 网络流分派引擎</p>
      </div>
    </aside>
  );
}
