import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  GitMerge,
  Upload,
  Menu,
  X,
  Construction,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '总览看板', icon: LayoutDashboard },
  { to: '/points', label: '点位管理', icon: MapPin },
  { to: '/merge', label: '点位归并', icon: GitMerge },
  { to: '/import', label: '数据导入', icon: Upload },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-slate-100 flex flex-col border-r border-slate-700 transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-slate-700">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <Construction size={18} className="text-slate-900" />
          </div>
          {!collapsed && (
            <span className="font-serif text-base font-semibold whitespace-nowrap">
              慢行桥比选系统
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="ml-auto p-1 hover:bg-slate-800 rounded transition-colors"
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded transition-all',
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border-l-2 border-amber-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          数据本地存储 · v1.0
        </div>
      )}
    </aside>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shadow-sm">
          <h1 className="font-serif text-lg text-slate-800">慢行桥坡道方案比选</h1>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="px-3 py-1 bg-slate-100 rounded">街道周姐</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
