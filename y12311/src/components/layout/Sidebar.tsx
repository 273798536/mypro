import React from 'react';
import {
  LayoutDashboard,
  Users,
  PlaySquare,
  BarChart3,
  GitCompare,
  AlertTriangle,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  collapsed?: boolean;
}

const menuItems = [
  { path: '/dashboard', label: '总览面板', icon: LayoutDashboard },
  { path: '/queue-detail', label: '排队明细', icon: Users },
  { path: '/simulation', label: '排队模拟', icon: PlaySquare },
  { path: '/distribution', label: '等待分布', icon: BarChart3 },
  { path: '/comparison', label: '方案对比', icon: GitCompare },
  { path: '/exceptions', label: '异常清单', icon: AlertTriangle },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  return (
    <aside
      className={`h-screen bg-neutral-800 text-white flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="p-4 border-b border-neutral-700">
        <h1
          className={`font-serif font-bold text-xl text-primary-400 whitespace-nowrap overflow-hidden transition-all ${
            collapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}
        >
          随机过程排队窗口
        </h1>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1 px-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.path} style={{ animationDelay: `${index * 0.05}s` }} className="animate-fade-in">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-500/20 text-primary-400 shadow-card-active'
                        : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                    }`
                  }
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span
                    className={`whitespace-nowrap overflow-hidden transition-all ${
                      collapsed ? 'opacity-0 w-0' : 'opacity-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-neutral-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-medium">
            管
          </div>
          <div
            className={`whitespace-nowrap overflow-hidden transition-all ${
              collapsed ? 'opacity-0 w-0' : 'opacity-100'
            }`}
          >
            <div className="text-sm font-medium">管理员</div>
            <div className="text-xs text-neutral-400">政务大厅</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
