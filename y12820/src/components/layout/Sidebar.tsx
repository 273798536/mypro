import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TestTube,
  ShieldCheck,
  BarChart3,
  FileText,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/samples', label: '样本管理', icon: TestTube },
  { path: '/qc', label: '质控中心', icon: ShieldCheck },
  { path: '/analysis', label: '差异分析', icon: BarChart3 },
  { path: '/reports', label: '报告中心', icon: FileText },
  { path: '/test-scenarios', label: '测试场景', icon: FlaskConical },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold text-primary-700">实验管理系统</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all',
                isActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100',
                sidebarCollapsed && 'justify-center'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg bg-gray-50 p-3',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
            <User className="h-5 w-5 text-primary-600" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">张研究员</p>
              <p className="truncate text-xs text-gray-500">管理员</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
