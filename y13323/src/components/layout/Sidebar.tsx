import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  RotateCcw,
  FileBarChart,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '总览仪表盘' },
  { path: '/samples', icon: FileText, label: '样本表' },
  { path: '/withdrawals', icon: RotateCcw, label: '撤回记录' },
  { path: '/report', icon: FileBarChart, label: '回放报告' },
  { path: '/timeline', icon: Clock, label: '历史时间线' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-deep-blue-500 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-deep-blue-400">
        <h1 className="font-serif-sc text-xl font-bold tracking-wide">
          作文批改误判回放
        </h1>
        <p className="text-deep-blue-200 text-sm mt-1">Essay Replay System</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200',
                'hover:bg-deep-blue-400/50 hover:pl-7',
                isActive
                  ? 'bg-accent-blue-500 text-white border-l-4 border-white pl-5'
                  : 'text-deep-blue-100 border-l-4 border-transparent'
              )
            }
          >
            <item.icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-deep-blue-400">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent-blue-400 flex items-center justify-center font-bold text-sm">
            乔
          </div>
          <div>
            <p className="text-sm font-medium">算法工程师</p>
            <p className="text-xs text-deep-blue-200">小乔 · 在线</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
