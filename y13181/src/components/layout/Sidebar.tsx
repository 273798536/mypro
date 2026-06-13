import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListFilter, FileSearch, RefreshCw, Download, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '复核概览', icon: LayoutDashboard },
  { path: '/list', label: '数据列表', icon: ListFilter },
  { path: '/detail', label: '详情复核', icon: FileSearch },
  { path: '/recalc', label: '复算对比', icon: RefreshCw },
  { path: '/export', label: '导出交付', icon: Download },
];

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  return (
    <aside className={cn('w-56 bg-deep-blue-700/80 backdrop-blur-sm border-r border-white/5 flex flex-col', className)}>
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-glow to-teal-glow/60 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-deep-blue-900" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">水滴预警</div>
          <div className="text-[10px] text-gray-500">冷却塔复核系统</div>
        </div>
      </div>
      
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                active
                  ? 'bg-teal-glow/10 text-teal-glow shadow-[0_0_0_1px_rgba(0,212,170,0.2)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4', active && 'text-teal-glow')} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/5">
        <div className="text-[10px] text-gray-500 mb-1">当前操作员</div>
        <div className="text-sm font-medium text-gray-300">项目助理 · 小宋</div>
      </div>
    </aside>
  );
};
