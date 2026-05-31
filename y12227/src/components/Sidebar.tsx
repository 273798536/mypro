import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Wallet,
  PieChart,
  AlertTriangle,
  BarChart3,
  GitBranch,
  Cloud,
} from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
  { path: '/', label: '概览', icon: LayoutDashboard },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/ledger', label: '余额账本', icon: Wallet },
  { path: '/allocation', label: '项目分摊', icon: PieChart },
  { path: '/exceptions', label: '异常复核', icon: AlertTriangle },
  { path: '/analysis', label: '消耗分析', icon: BarChart3 },
  { path: '/trace', label: '追溯查询', icon: GitBranch },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-gradient-to-b from-primary-800 to-primary-900 text-white flex flex-col h-screen fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">云费管理</h1>
            <p className="text-xs text-primary-200">预付费消耗系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-white/15 text-white shadow-lg shadow-black/10'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary-700">
        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-xs text-primary-200 mb-2">当前账期</p>
          <p className="font-semibold text-lg">2024年05月</p>
        </div>
      </div>
    </aside>
  );
}
