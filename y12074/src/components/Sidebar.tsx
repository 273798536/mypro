import { NavLink } from 'react-router-dom';
import {
  Home,
  Database,
  Box,
  GitBranch,
  AlertTriangle,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  anomalyCount?: number;
  badRowCount?: number;
}

export function Sidebar({ anomalyCount = 0, badRowCount = 0 }: SidebarProps) {
  const navItems: NavItem[] = [
    {
      path: '/',
      label: '仪表盘',
      icon: <Home size={20} />,
    },
    {
      path: '/import',
      label: '数据导入',
      icon: <Database size={20} />,
      badge: badRowCount > 0 ? badRowCount : undefined,
    },
    {
      path: '/simulation',
      label: '滑槽仿真',
      icon: <Box size={20} />,
    },
    {
      path: '/sorting',
      label: '分拣口监控',
      icon: <GitBranch size={20} />,
    },
    {
      path: '/anomalies',
      label: '异常分析',
      icon: <AlertTriangle size={20} />,
      badge: anomalyCount > 0 ? anomalyCount : undefined,
    },
    {
      path: '/report',
      label: '报告导出',
      icon: <FileText size={20} />,
    },
  ];

  return (
    <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 12h2l2-5 3 10 3-15 3 20 3-10 2 5h2" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">行李滑槽仿真</h1>
            <p className="text-gray-500 text-xs">Baggage Chute Simulator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
              )
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Settings size={14} />
            <span>系统状态</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">服务正常</span>
          </div>
        </div>
      </div>
    </div>
  );
}
