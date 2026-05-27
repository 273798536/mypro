import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  SlidersHorizontal,
  FileText,
  History,
  Database
} from 'lucide-react';
import { cn } from '../../utils/cn';

const navItems = [
  { path: '/', label: '主面板', icon: LayoutDashboard },
  { path: '/simulation', label: '情景模拟', icon: SlidersHorizontal },
  { path: '/report', label: '报告导出', icon: FileText },
  { path: '/history', label: '历史记录', icon: History },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#165DFF] to-[#7B61FF] rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Markov预测</h1>
            <p className="text-xs text-gray-400">会员留存分析</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-[#165DFF] text-white shadow-lg shadow-[#165DFF]/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2">数据来源</p>
          <p className="text-sm font-medium text-white truncate">
            本地存储
          </p>
          <p className="text-xs text-gray-500 mt-1">
            所有数据保存在浏览器本地
          </p>
        </div>
      </div>
    </aside>
  );
};
