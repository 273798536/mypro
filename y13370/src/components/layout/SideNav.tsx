import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Clock, GitCompare, TriangleAlert, Signal
} from 'lucide-react';

const navItems = [
  { path: '/', label: '总览看板', icon: LayoutDashboard, key: 'dash' },
  { path: '/failure-queue', label: '失败队列追踪', icon: AlertTriangle, key: 'fail' },
  { path: '/timeline', label: '历史时间线', icon: Clock, key: 'timeline' },
  { path: '/compare', label: '版本对比', icon: GitCompare, key: 'cmp' },
  { path: '/late-features', label: '特征迟到专区', icon: TriangleAlert, key: 'feat' },
];

export const SideNav: React.FC = () => {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border-default bg-surface/40 backdrop-blur-sm">
      <div className="px-6 py-6 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-[#d97706] flex items-center justify-center glow-ring-amber">
              <Signal className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald border-2 border-surface animate-pulse-amber" />
          </div>
          <div className="min-w-0">
            <div className="font-mono font-bold text-[13px] text-primary tracking-wide">
              TRACK<span className="text-amber">.CORE</span>
            </div>
            <div className="text-[11px] text-muted mt-0.5">训练队列任务追踪</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted">
          功能导航
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 ease-out ${
                  isActive
                    ? 'bg-elevated text-amber border border-border-emphasis glow-ring-amber'
                    : 'text-secondary hover:bg-hover hover:text-primary border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border-default space-y-2">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-elevated/50">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-info to-[#1e40af] flex items-center justify-center text-[11px] font-mono font-bold text-white">
            AC
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-primary truncate">平台算法 · 阿岑</div>
            <div className="text-[10px] text-muted">当前会话 可读写</div>
          </div>
        </div>
        <div className="px-2 flex items-center gap-2 text-[10px] text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse-amber" />
          实时同步 · 已校验 38 条
        </div>
      </div>
    </aside>
  );
};
