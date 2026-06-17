import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSearch,
  GitBranch,
  FileText,
  Upload,
  Settings,
  Bot
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '数据概览' },
  { path: '/review', icon: FileSearch, label: '意图复核' },
  { path: '/versions', icon: GitBranch, label: '版本追踪' },
  { path: '/reports', icon: FileText, label: '报告导出' },
  { path: '/import', icon: Upload, label: '材料导入' },
  { path: '/settings', icon: Settings, label: '配置管理' }
];

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">客服机器人</h1>
              <p className="text-sm text-blue-200">意图漂移检测</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="bg-blue-900/50 rounded-lg p-3">
            <p className="text-xs text-blue-200">当前版本</p>
            <p className="text-sm font-medium">v2.0.0</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
