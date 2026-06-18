import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GitCompare, ListChecks, FileText } from 'lucide-react';
import { cn } from '@/utils/helpers';

const navItems = [
  { path: '/', label: '总览面板', icon: LayoutDashboard },
  { path: '/compare', label: '灰度对比', icon: GitCompare },
  { path: '/samples/v5', label: '样本详情', icon: ListChecks },
  { path: '/versions/v5', label: '版本说明', icon: FileText },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-bg-secondary border-r border-border-color flex flex-col">
      <div className="p-6 border-b border-border-color">
        <h1 className="font-display text-xl font-bold text-white">
          商品属性灰度对比
        </h1>
        <p className="text-xs text-gray-400 mt-1">算法值班平台</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-bg-tertiary hover:text-white',
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue glow-border'
                  : 'text-gray-400'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border-color">
        <div className="bg-bg-tertiary rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2">当前值班</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-bold">
              算
            </div>
            <div>
              <p className="text-sm text-white font-medium">算法值班人</p>
              <p className="text-xs text-accent-green flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-breathe" />
                在线
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
