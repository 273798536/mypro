import { NavLink } from 'react-router-dom';
import { Mountain, Table, FileText, GitCompare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const navItems = [
  { path: '/', label: '3D地形模型', icon: Mountain },
  { path: '/cracks', label: '裂缝点管理', icon: Table },
  { path: '/report', label: '风险报告', icon: FileText },
  { path: '/compare', label: '修正对比', icon: GitCompare },
];

export function Sidebar() {
  const duplicateCount = useAppStore((state) => state.cracks.filter((c) => c.isDuplicate).length);
  const gapCount = useAppStore((state) => state.dataGaps.length);

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Mountain className="w-6 h-6 text-blue-400" />
          山地滑坡剖面台
        </h1>
        <p className="text-xs text-slate-500 mt-1">地质灾害监测系统</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
            {item.path === '/cracks' && duplicateCount > 0 && (
              <span className="ml-auto bg-status-duplicate text-white text-xs px-1.5 py-0.5 rounded-full">
                {duplicateCount}
              </span>
            )}
            {item.path === '/' && gapCount > 0 && (
              <span className="ml-auto bg-status-gap text-white text-xs px-1.5 py-0.5 rounded-full">
                {gapCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="bg-slate-850 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-2">数据状态</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">重复记录</span>
              <span className="text-status-duplicate font-medium">{duplicateCount} 条</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">数据缺口</span>
              <span className="text-status-gap font-medium">{gapCount} 条</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
