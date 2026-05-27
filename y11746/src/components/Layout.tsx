import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Upload, Table, AlertTriangle, FileText, History } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '数据导入', icon: Upload },
  { path: '/workbench', label: '核销工作台', icon: Table },
  { path: '/exceptions', label: '异常清单', icon: AlertTriangle },
  { path: '/report', label: '报告导出', icon: FileText },
  { path: '/history', label: '修正痕迹', icon: History },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const exceptions = useAppStore(state => state.exceptions);
  const unresolvedCount = exceptions.filter(e => !e.resolved).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800">慈善捐赠票据核销</h1>
          <p className="text-xs text-gray-500 mt-1">基金会财务管理系统</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const showBadge = item.path === '/exceptions' && unresolvedCount > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {showBadge && (
                  <span className="absolute right-4 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {unresolvedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            v1.0.0
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
