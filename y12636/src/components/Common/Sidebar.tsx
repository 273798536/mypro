import { NavLink } from 'react-router-dom';
import { LayoutGrid, FolderClock, History, FileText, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';

const navItems = [
  { to: '/', label: '调度画布', icon: LayoutGrid, end: true },
  { to: '/materials', label: '材料管理', icon: FolderClock },
  { to: '/history', label: '历史记录', icon: History },
  { to: '/report', label: '报告导出', icon: FileText },
];

export default function Sidebar() {
  const { errors, operations } = useStore();
  const unconfirmedOps = operations.filter((o) => !o.isConfirmed).length;
  const totalErrors = errors.length;

  return (
    <aside className="w-60 bg-port-panel border-r border-port-border flex flex-col">
      <nav className="flex-1 py-4">
        <p className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          工作台
        </p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-all ${
                isActive
                  ? 'bg-port-deep/20 text-white border-r-2 border-port-deep'
                  : 'text-slate-400 hover:bg-port-border/50 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-port-border space-y-3">
        {(unconfirmedOps > 0 || totalErrors > 0) && (
          <div className="panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-port-warning" />
              <span className="text-xs font-medium text-port-warning">待处理</span>
            </div>
            {unconfirmedOps > 0 && (
              <p className="text-xs text-slate-400">
                <span className="text-port-warning font-bold">{unconfirmedOps}</span> 条操作待人工确认
              </p>
            )}
            {totalErrors > 0 && (
              <p className="text-xs text-slate-400">
                <span className="text-port-danger font-bold">{totalErrors}</span> 条错误记录
              </p>
            )}
          </div>
        )}

        <div className="panel p-3">
          <p className="text-xs font-medium text-slate-300 mb-1">当前版本</p>
          <p className="text-xs text-slate-500 font-mono">v1.0.0 · 教学演示版</p>
          <p className="text-xs text-slate-500 mt-1">含示例数据</p>
        </div>
      </div>
    </aside>
  );
}
