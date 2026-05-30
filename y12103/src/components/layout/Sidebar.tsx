import { NavLink } from 'react-router-dom';
import {
  Database,
  LayoutDashboard,
  PackageOpen,
  AlertTriangle,
  GitCompare,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '数据导入', icon: Database },
  { path: '/overview', label: '库存概览', icon: LayoutDashboard },
  { path: '/replenishment', label: '补货建议', icon: PackageOpen },
  { path: '/anomaly', label: '异常分析', icon: AlertTriangle },
  { path: '/compare', label: '历史对比', icon: GitCompare },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-primary-800 min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-white">概率库存补货器</h1>
            <p className="text-xs text-primary-300">Probabilistic Inventory Planner</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-primary-700">
        <div className="bg-primary-900/50 rounded-lg p-4">
          <p className="text-xs text-primary-300 mb-2">系统提示</p>
          <p className="text-sm text-primary-200">
            所有计算均在本地完成，数据不会上传至服务器。
          </p>
        </div>
      </div>
    </aside>
  );
}
