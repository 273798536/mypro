import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  History,
  Settings,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '归属台账', icon: LayoutDashboard },
  { path: '/exercises', label: '行权申请', icon: FileText },
  { path: '/history', label: '历史记录', icon: History },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
          功能导航
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          系统信息
        </div>
        <div className="space-y-2 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>计算日期</span>
            <span className="font-mono text-slate-700">2026-05-30</span>
          </div>
          <div className="flex justify-between">
            <span>员工总数</span>
            <span className="font-mono text-slate-700">6人</span>
          </div>
          <div className="flex justify-between">
            <span>异常记录</span>
            <span className="font-mono text-warning-600">4条</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
