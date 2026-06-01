import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Music,
  Disc,
  FileCheck,
  GitBranch,
  History,
  Download,
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: '总览仪表盘', icon: LayoutDashboard },
  { path: '/samples', label: '采样素材库', icon: Music },
  { path: '/tracks', label: '曲目项目库', icon: Disc },
  { path: '/licenses', label: '授权报告库', icon: FileCheck },
  { path: '/trace', label: '双向追溯', icon: GitBranch },
  { path: '/compare', label: '版本对比', icon: History },
  { path: '/export', label: '导出中心', icon: Download },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-secondary min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-accent flex items-center gap-2">
          <Music className="w-8 h-8" />
          <span>音频采样授权台账</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">专业授权管理系统</p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-accent/20 text-accent border-l-4 border-accent'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/10">
        <p className="text-xs text-gray-500 text-center">
          © 2025 音频采样授权台账
        </p>
      </div>
    </aside>
  );
};
