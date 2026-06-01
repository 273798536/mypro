import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Map,
  Calendar,
  AlertTriangle,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '巡检看板', icon: LayoutDashboard },
  { path: '/work-orders', label: '工单管理', icon: ClipboardList },
  { path: '/building-map', label: '楼栋巡检图', icon: Map },
  { path: '/schedule', label: '排程中心', icon: Calendar },
  { path: '/anomalies', label: '异常分析', icon: AlertTriangle },
  { path: '/reports', label: '报表导出', icon: FileBarChart },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, anomalies } = useStore();
  const unresolvedCount = anomalies.filter(a => !a.resolved).length;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-900 text-white transition-all duration-300 z-50',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <Map size={18} />
            </div>
            <span className="font-bold text-lg">巡检换班器</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mx-auto">
            <Map size={18} />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="p-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-all duration-200 relative',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.path === '/anomalies' && unresolvedCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    {unresolvedCount}
                  </span>
                )}
              </>
            )}
            {sidebarCollapsed && item.path === '/anomalies' && unresolvedCount > 0 && (
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </NavLink>
        ))}
      </nav>

      {!sidebarCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">今日日期</div>
            <div className="text-sm font-medium">2026年6月1日</div>
            <div className="text-xs text-slate-400 mt-2">工程主管 登录中</div>
          </div>
        </div>
      )}
    </aside>
  );
}
