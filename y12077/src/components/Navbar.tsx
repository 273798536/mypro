import { NavLink } from 'react-router-dom';
import { Box, History, AlertTriangle, Route, HelpCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Navbar() {
  const { conflicts } = useStore();
  const unresolvedCount = conflicts.filter((c) => !c.resolved).length;

  const navItems = [
    {
      to: '/',
      icon: Box,
      label: '3D热图',
      end: true,
    },
    {
      to: '/versions',
      icon: History,
      label: '版本管理',
    },
    {
      to: '/conflicts',
      icon: AlertTriangle,
      label: '冲突检测',
      badge: unresolvedCount > 0 ? unresolvedCount : undefined,
    },
    {
      to: '/playback',
      icon: Route,
      label: '路径回放',
    },
  ];

  return (
    <nav className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <Box size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">仓储热图分析</span>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all relative ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <HelpCircle size={18} />
        </button>
      </div>
    </nav>
  );
}
