import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  Shield,
  FileText,
  Database,
  Waves,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';

const navItems = [
  { path: '/dashboard', label: '总览仪表盘', icon: LayoutDashboard },
  { path: '/map', label: '地图联动', icon: Map },
  { path: '/conflicts', label: '数据冲突中心', icon: AlertTriangle },
  { path: '/risks', label: '风险分层', icon: Shield },
  { path: '/reports', label: '报告导出', icon: FileText },
  { path: '/data', label: '数据管理', icon: Database },
];

export default function Sidebar() {
  const location = useLocation();
  const { viewMode, setViewMode } = useAppStore();

  return (
    <aside className="w-64 h-full bg-ocean-700/80 border-r border-teal-glow-500/10 flex flex-col">
      <div className="p-6 border-b border-teal-glow-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-teal-glow-400 to-teal-glow-600 flex items-center justify-center">
            <Waves className="w-6 h-6 text-ocean-900" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white glow-text">离岸点检系统</h1>
            <p className="text-xs text-ocean-200/50">Offshore Inspection</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-teal-glow-500/10">
        <div className="text-xs text-ocean-200/50 mb-2">视图模式</div>
        <div className="flex rounded bg-ocean-800 p-1">
          <button
            onClick={() => setViewMode('fleet')}
            className={`flex-1 py-1.5 text-xs rounded transition-colors ${
              viewMode === 'fleet'
                ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                : 'text-ocean-200/50 hover:text-ocean-100'
            }`}
          >
            船队
          </button>
          <button
            onClick={() => setViewMode('expert')}
            className={`flex-1 py-1.5 text-xs rounded transition-colors ${
              viewMode === 'expert'
                ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                : 'text-ocean-200/50 hover:text-ocean-100'
            }`}
          >
            海洋老师
          </button>
        </div>
        <p className="text-xs text-ocean-200/30 mt-2">
          {viewMode === 'fleet'
            ? '简化视图，仅显示可用/暂缓/重采'
            : '专业视图，完整数据与溯源'}
        </p>
      </div>
    </aside>
  );
}
