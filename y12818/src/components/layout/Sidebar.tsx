import {
  LayoutDashboard,
  Workflow,
  FileBarChart,
  AlertTriangle,
  GitBranch,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// 侧边栏菜单项配置
const menuItems = [
  {
    path: '/dashboard',
    label: '仪表盘',
    icon: LayoutDashboard,
  },
  {
    path: '/workflow',
    label: '工作流',
    icon: Workflow,
  },
  {
    path: '/report',
    label: '报告导出',
    icon: FileBarChart,
  },
  {
    path: '/review',
    label: '异常复核',
    icon: AlertTriangle,
  },
  {
    path: '/traceability',
    label: '数据追溯',
    icon: GitBranch,
  },
];

interface SidebarProps {
  className?: string;
}

// 侧边导航栏组件
export default function Sidebar({ className }: SidebarProps) {
  // 侧边栏折叠状态
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-950',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Logo 区域 */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        {!collapsed && (
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            培养基追溯
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white',
            collapsed && 'mx-auto',
          )}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-950/50 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
                  collapsed && 'justify-center px-0',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* 底部信息 */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        {!collapsed && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            v1.0.0 © 2026
          </div>
        )}
      </div>
    </aside>
  );
}
