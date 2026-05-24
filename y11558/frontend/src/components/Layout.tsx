import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  FileWarning,
  FileSpreadsheet,
  Download,
  History,
  Terminal,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '链路总览' },
  { path: '/chains', icon: GitBranch, label: '链路管理' },
  { path: '/dirty-data', icon: FileWarning, label: '异常中心' },
  { path: '/reconciliation', icon: FileSpreadsheet, label: '对账工作台' },
  { path: '/export', icon: Download, label: '报表导出' },
  { path: '/history', icon: History, label: '历史查询' },
  { path: '/tech-view', icon: Terminal, label: '技术视图' },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-y-0 z-50 flex w-64 flex-col bg-primary-700">
        <div className="flex h-16 items-center justify-center border-b border-primary-600">
          <h1 className="text-lg font-bold text-white">农资验收链路系统</h1>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-primary-600 p-4">
          <div className="text-sm text-primary-200">
            <p className="font-medium">当前用户：演示用户</p>
            <p className="mt-1 text-xs opacity-75">角色：片区经理</p>
          </div>
        </div>
      </div>

      <div className="pl-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
