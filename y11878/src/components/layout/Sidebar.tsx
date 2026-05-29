import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GitBranch, LineChart } from 'lucide-react';

const navItems = [
  { path: '/', label: '分析看板', icon: LayoutDashboard },
  { path: '/trace', label: '瓶颈追溯', icon: GitBranch },
  { path: '/scenario', label: '情景对比', icon: LineChart },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-base-900 border-r border-base-700 flex-shrink-0">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent-orange/10 text-accent-orange border border-accent-orange/30'
                  : 'text-base-500 hover:text-white hover:bg-base-800 border border-transparent'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-base-700 mt-4">
        <div className="text-xs text-base-500 space-y-1">
          <p className="font-mono">Edmonds-Karp 算法</p>
          <p>瓶颈阈值: ≥90%</p>
          <p>单一数据源</p>
        </div>
      </div>
    </aside>
  );
}
