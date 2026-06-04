import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PenTool,
  CheckSquare,
  Database,
  FileDown,
  Menu,
  X,
  Activity,
  AlertTriangle,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '项目列表', icon: LayoutDashboard },
  { path: '/annotate/TASK-001', label: '标注工作台', icon: PenTool },
  { path: '/review/TASK-001', label: '复核关卡', icon: CheckSquare },
  { path: '/data', label: '数据管理', icon: Database },
  { path: '/export/TASK-001', label: '导出中心', icon: FileDown },
];

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path.replace('/TASK-001', ''));
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-neutral-800 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-sm flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <h1 className="font-bold text-sm">骨架标注系统</h1>
                <p className="text-xs text-neutral-400">运动姿态评估</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-neutral-700 rounded-sm transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          <div className="px-3 mb-2">
            {sidebarOpen && (
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 px-2">
                功能导航
              </p>
            )}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-sm transition-all duration-200 ${
                  active
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-700">
          <div className="bg-danger-500/10 border border-danger-500/30 rounded-sm p-3">
            <div className="flex items-center gap-2 text-danger-400">
              <AlertTriangle size={16} />
              {sidebarOpen && <span className="text-xs font-medium">待复核边界案例</span>}
            </div>
            {sidebarOpen && (
              <p className="text-xl font-bold text-white mt-1">3</p>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-neutral-800">
              {navItems.find((item) => isActive(item.path))?.label || '系统'}
            </h2>
            {location.pathname !== '/' && (
              <span className="badge badge-warning">
                TASK-001 · 下蹲动作评估
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-neutral-500">
              当前用户：<span className="font-medium text-neutral-700">李安全（安全培训师）</span>
            </div>
            <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-sm flex items-center justify-center font-semibold">
              李
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
