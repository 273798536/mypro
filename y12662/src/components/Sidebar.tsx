import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Box,
  History,
  Ship,
} from 'lucide-react';

const navItems = [
  { to: '/', label: '工作台', icon: LayoutDashboard },
  { to: '/records', label: '测量记录', icon: ListChecks },
  { to: '/3d', label: '3D 可视化台', icon: Box },
  { to: '/audit', label: '历史审计', icon: History },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-marine-900 border-r border-marine-700/50 flex flex-col">
      <div className="h-14 px-5 flex items-center gap-2 border-b border-marine-700/50">
        <Ship className="w-6 h-6 text-marine-300" />
        <span className="font-semibold text-marine-100 tracking-wide">
          船舱配载 3D 台
        </span>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors ${
                isActive
                  ? 'bg-marine-700 text-white shadow-panel'
                  : 'text-marine-200 hover:bg-marine-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-marine-700/50 text-xs text-marine-400">
        水利工程配载复核系统
        <br />
        v1.0.0
      </div>
    </aside>
  );
}
