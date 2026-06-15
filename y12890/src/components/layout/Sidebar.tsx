import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Waves,
  AlertTriangle,
  Map,
  FileCheck,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Fish,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { taskId } = useParams();

  const navItems = [
    {
      path: '/',
      label: '任务队列',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      path: taskId ? `/tasks/${taskId}/tide` : '#',
      label: '潮汐计算',
      icon: Waves,
      disabled: !taskId,
    },
    {
      path: taskId ? `/tasks/${taskId}/risk` : '#',
      label: '风险评估',
      icon: AlertTriangle,
      disabled: !taskId,
    },
    {
      path: taskId ? `/tasks/${taskId}/review` : '#',
      label: '复核工作台',
      icon: FileCheck,
      disabled: !taskId,
    },
    {
      path: taskId ? `/tasks/${taskId}/map` : '#',
      label: '地图面板',
      icon: Map,
      disabled: !taskId,
    },
    {
      path: taskId ? `/tasks/${taskId}/export` : '#',
      label: '结果导出',
      icon: Download,
      disabled: !taskId,
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-ocean-900 text-white flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-ocean-800">
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-tide-400 to-ocean-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Fish className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <h1 className="font-display text-lg font-bold leading-tight">明珠海珍品</h1>
              <p className="text-xs text-ocean-300">水下机器人任务队列</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 space-y-1">
          {navItems.map((item, index) => {
            if (item.disabled && !taskId) return null;

            const Icon = item.icon;
            return (
              <NavLink
                key={index}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-ocean-800 text-white shadow-inner'
                      : 'text-ocean-200 hover:bg-ocean-800/50 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {!collapsed && taskId && (
        <div className="px-4 py-3 border-t border-ocean-800">
          <div className="bg-ocean-800/50 rounded-lg p-3">
            <p className="text-xs text-ocean-300 mb-1">当前任务</p>
            <p className="text-sm font-medium truncate">明珠海珍品 · 2026年6月巡检</p>
          </div>
        </div>
      )}

      <div className="border-t border-ocean-800">
        <button
          onClick={onToggle}
          className="w-full p-3 flex items-center justify-center gap-2 text-ocean-300 hover:text-white hover:bg-ocean-800/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">收起菜单</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
