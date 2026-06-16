import { NavLink } from 'react-router-dom';
import { BarChart3, Activity, FileCheck, FileText, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '主工作台', icon: BarChart3 },
  { to: '/review', label: '复核中心', icon: FileCheck },
  { to: '/export', label: '报告导出', icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="font-bold text-lg">海藻养殖</h1>
            <p className="text-xs text-slate-400">收成估算工具</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <GitBranch size={12} />
            版本 1.0.0
          </div>
          <p className="text-xs text-slate-500">
            科研工具 · 计算透明 · 过程可追溯
          </p>
        </div>
      </div>
    </aside>
  );
}
