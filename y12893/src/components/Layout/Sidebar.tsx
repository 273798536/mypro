import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Box,
  Droplets,
  Workflow,
  GitBranch,
  Waves,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/store/useDataStore';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '数据质量概览', badge: true },
  { path: '/review-3d', icon: Box, label: '3D交互复核' },
  { path: '/track-cleaning', icon: Droplets, label: '轨迹清洗（日常）' },
  { path: '/workbench', icon: Workflow, label: '复核工作台' },
  { path: '/traceability', icon: GitBranch, label: '数据溯源' },
  { path: '/tide-analysis', icon: Waves, label: '潮汐计算（月底）' },
  { path: '/settings', icon: Settings, label: '系统设置' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { qualityStats } = useDataStore();
  const location = useLocation();

  const badCount = qualityStats ? qualityStats.unitMismatch + qualityStats.negativeDepth : 0;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-gradient-to-b from-[#0A2463] to-[#051439]',
        'text-white transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          'p-4 border-b border-white/10 flex items-center',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3E92CC] to-[#0A2463] flex items-center justify-center">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">岛礁供电</h1>
                <p className="text-[10px] text-white/60">负荷预测系统</p>
              </div>
            </div>
          )}
          {collapsed && <Waves className="w-6 h-6" />}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group',
                      'hover:bg-white/10',
                      isActive && 'bg-white/15 border-l-2 border-[#3E92CC]',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <item.icon className={cn(
                      'w-5 h-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-[#3E92CC]' : 'text-white/70 group-hover:text-white'
                    )} />
                    {!collapsed && (
                      <>
                        <span className="text-sm flex-1">{item.label}</span>
                        {item.badge && badCount > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E63946] text-[10px] font-bold animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            {badCount}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && badCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E63946] text-[9px] flex items-center justify-center font-bold">
                        {badCount > 9 ? '9+' : badCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-2 border-t border-white/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full flex items-center justify-center py-2 rounded-lg',
              'hover:bg-white/10 transition-colors text-white/60 hover:text-white'
            )}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
