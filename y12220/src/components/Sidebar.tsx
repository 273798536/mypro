import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Ticket,
  Plane,
  Calculator,
  FileCheck,
  History,
  BarChart3,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

export const defaultMenuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'tickets',
    label: '客票管理',
    icon: Ticket,
    path: '/tickets',
  },
  {
    id: 'segments',
    label: '航段管理',
    icon: Plane,
    path: '/segments',
  },
  {
    id: 'calculator',
    label: '改签计算',
    icon: Calculator,
    path: '/calculator',
  },
  {
    id: 'review',
    label: '待我复核',
    icon: FileCheck,
    path: '/review',
    badge: 3,
  },
  {
    id: 'history',
    label: '历史记录',
    icon: History,
    path: '/history',
  },
  {
    id: 'reports',
    label: '报表中心',
    icon: BarChart3,
    path: '/reports',
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: Settings,
    path: '/settings',
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  menuItems?: MenuItem[];
  className?: string;
}

export default function Sidebar({
  isOpen,
  onToggle,
  menuItems = defaultMenuItems,
  className,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col',
          'w-64 bg-primary-700 dark:bg-primary-800',
          'border-r border-primary-600 dark:border-primary-700',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-600 dark:border-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div
              className={cn(
                'flex flex-col transition-opacity duration-200',
                !isOpen && 'lg:hidden'
              )}
            >
              <span className="text-white font-bold text-lg">联程改签</span>
              <span className="text-primary-200 text-xs">差价计算系统</span>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
            aria-label="关闭侧边栏"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'text-primary-100 hover:bg-white/10 hover:text-white',
                    isActive &&
                      'bg-white/15 text-white font-medium shadow-lg shadow-black/10',
                    !isOpen && 'lg:justify-center lg:px-2'
                  )
                }
                title={!isOpen ? item.label : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'truncate transition-opacity duration-200',
                    !isOpen && 'lg:hidden'
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div
          className={cn(
            'p-3 border-t border-primary-600 dark:border-primary-700',
            !isOpen && 'lg:hidden'
          )}
        >
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
              管
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">管理员</p>
              <p className="text-primary-200 text-xs truncate">admin@airline.com</p>
            </div>
          </div>
        </div>
      </aside>

      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 lg:hidden"
          aria-label="打开侧边栏"
        >
          <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
      )}
    </>
  );
}
