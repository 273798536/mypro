import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, Link2, TrendingDown, DollarSign, Menu, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '概览看板' },
  { path: '/import', icon: Upload, label: '数据导入' },
  { path: '/matching', icon: Link2, label: '到账匹配' },
  { path: '/loss', icon: TrendingDown, label: '汇损明细' },
  { path: '/rates', icon: DollarSign, label: '汇率管理' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-gradient-to-b from-primary-700 to-primary-800 text-white transition-all duration-300 z-30 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-primary-600">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold tracking-wide">汇损管理系统</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-primary-600 transition-colors ml-auto"
        >
          {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      <nav className="p-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white'
              } ${sidebarCollapsed ? 'justify-center' : ''}`
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon size={20} strokeWidth={2} />
            {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {!sidebarCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-600">
          <div className="bg-primary-600/50 rounded-lg p-3">
            <p className="text-xs text-primary-200 mb-1">数据存储</p>
            <p className="text-sm text-white">本地 IndexedDB</p>
          </div>
        </div>
      )}
    </aside>
  );
}
