import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Gauge,
  Upload,
  Settings,
  ClipboardList,
  Edit3,
  Menu,
  X,
  Train,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '间隙分析', icon: Gauge },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/threshold', label: '阈值管理', icon: Settings },
  { path: '/workorder', label: '工单联动', icon: ClipboardList },
  { path: '/correction', label: '手动修正', icon: Edit3 },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-industrial-bg flex">
      <aside
        className={cn(
          'bg-industrial-panel border-r border-industrial-border/20 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="p-4 border-b border-industrial-border/20 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center flex-shrink-0">
              <Train size={18} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="whitespace-nowrap">
                <h1 className="font-bold text-sm">磁悬浮间隙监测</h1>
                <p className="text-xs text-industrial-muted">运维分析系统</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-industrial-border/10 rounded-sm transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-150 group',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-industrial-muted hover:bg-industrial-border/10 hover:text-industrial-text border-l-2 border-transparent'
                )
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-industrial-border/20">
          {sidebarOpen && (
            <div className="text-xs text-industrial-muted">
              <p>版本 V2.0</p>
              <p className="mt-1">阈值版本: V1.0</p>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
