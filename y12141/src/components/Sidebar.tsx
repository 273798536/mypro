import { NavLink } from 'react-router-dom';
import { Calculator, Activity, Package, Map, BookOpen, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store';

const navItems = [
  { path: '/', label: '声衰减计算', icon: Calculator },
  { path: '/frequency', label: '频段分析', icon: Activity },
  { path: '/materials', label: '材料管理', icon: Package },
  { path: '/map', label: '地图导出', icon: Map },
  { path: '/guide', label: '使用说明', icon: BookOpen },
];

export const Sidebar = () => {
  const errors = useAppStore((state) => state.errors);
  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  return (
    <aside className="w-64 bg-primary-900 border-r border-primary-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-primary-800">
        <h1 className="text-xl font-bold font-display text-white">声学隔音墙评估</h1>
        <p className="text-xs text-primary-400 mt-1">Acoustic Barrier Assessment</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
                isActive
                  ? 'bg-primary-800 text-white border-l-2 border-accent-orange'
                  : 'text-primary-300 hover:bg-primary-800/50 hover:text-white border-l-2 border-transparent'
              }`
            }
          >
            <Icon size={18} />
            <span className="text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {(errorCount > 0 || warningCount > 0) && (
        <div className="p-4 border-t border-primary-800">
          <div className="bg-primary-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-accent-orange mb-2">
              <AlertTriangle size={16} />
              <span className="text-xs font-medium">数据校验问题</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-accent-red">
                {errorCount} 个错误
              </span>
              <span className="text-accent-orange">
                {warningCount} 个警告
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-primary-800">
        <p className="text-xs text-primary-500">v1.0.0 | 基于ISO 9613-2</p>
      </div>
    </aside>
  );
};
