import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  UtensilsCrossed,
  Calculator,
  GitBranch,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '仪表盘', icon: Home },
  { path: '/dishes', label: '菜品库', icon: UtensilsCrossed },
  { path: '/optimizer', label: '配餐优化', icon: Calculator },
  { path: '/trace', label: '冲突追溯', icon: GitBranch },
  { path: '/report', label: '报告导出', icon: FileText },
];

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  return (
    <aside
      className={cn(
        'w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white h-screen fixed left-0 top-0 shadow-xl',
        className
      )}
    >
      <div className="p-6 border-b border-slate-700/50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          组合优化配餐器
        </h1>
        <p className="text-slate-400 text-sm mt-1">智能配餐决策系统</p>
      </div>

      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">系统状态</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-slate-300">求解器在线</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
