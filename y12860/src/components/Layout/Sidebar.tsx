import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  Waves,
  Sparkles,
  PackageCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  Anchor,
} from 'lucide-react';
import { useTrackerStore } from '@/store/useTrackerStore';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/events', label: '事件追踪', icon: Activity },
  { path: '/risk-matrix', label: '风险矩阵', icon: ShieldAlert },
  { path: '/tide-report', label: '潮汐报告', icon: Waves },
  { path: '/data-cleaner', label: '数据清洗', icon: Sparkles },
  { path: '/delivery', label: '结果交付', icon: PackageCheck },
];

export default function Sidebar() {
  const { screenshotMode, toggleScreenshotMode } = useTrackerStore();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/events') {
      return location.pathname.startsWith('/events');
    }
    return location.pathname === path;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-ocean-950 border-r border-ocean-700/50 z-40',
        'flex flex-col transition-all duration-500 ease-in-out overflow-hidden',
        screenshotMode ? 'w-0 opacity-0 -translate-x-full' : 'w-64 opacity-100 translate-x-0'
      )}
    >
      <div className="h-16 flex items-center gap-3 px-5 border-b border-ocean-700/50 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-seafoam-500 to-seafoam-400 flex items-center justify-center shadow-glow">
          <Anchor className="w-5 h-5 text-ocean-950" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-lg text-seafoam-300 leading-tight">浮标追踪</span>
          <span className="text-[11px] text-ocean-400">海洋监测系统</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                active
                  ? 'bg-seafoam-500/15 text-seafoam-300 border border-seafoam-500/30 shadow-[0_0_12px_rgba(44,166,164,0.15)]'
                  : 'text-ocean-300 hover:bg-ocean-800/60 hover:text-ocean-100 border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors duration-200',
                  active ? 'text-seafoam-400' : 'text-ocean-400 group-hover:text-ocean-200'
                )}
              />
              <span className="font-medium">{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-seafoam-400 shadow-[0_0_6px_rgba(44,166,164,0.8)]" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-ocean-700/50 shrink-0">
        <button
          onClick={toggleScreenshotMode}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
            'border border-ocean-700/50 text-ocean-300 hover:bg-ocean-800/60 hover:text-ocean-100'
          )}
        >
          <Camera className="w-5 h-5 text-ocean-400" />
          <span className="font-medium flex-1 text-left">截图模式</span>
          <div
            className={cn(
              'w-10 h-5 rounded-full p-0.5 transition-colors duration-300',
              screenshotMode ? 'bg-seafoam-500' : 'bg-ocean-700'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300',
                screenshotMode ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </div>
        </button>

        <div className="mt-3 px-3 py-2 rounded-lg bg-ocean-800/40 border border-ocean-700/30">
          <div className="flex items-center gap-2 text-[11px] text-ocean-400">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>开启后侧边栏将自动收起</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </div>
        </div>
      </div>
    </aside>
  );
}
