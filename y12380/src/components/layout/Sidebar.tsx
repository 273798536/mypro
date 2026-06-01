import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Theater,
  CalendarClock,
  History,
  BarChart3,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '排班总览', icon: LayoutDashboard },
  { path: '/volunteers', label: '志愿者管理', icon: Users },
  { path: '/stages', label: '岗位舞台', icon: Theater },
  { path: '/schedule', label: '排班分配', icon: CalendarClock },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/analysis', label: '异常复盘', icon: BarChart3 }
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-orange-500 flex items-center justify-center">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">音乐节排班</h1>
            <p className="text-xs text-slate-400">志愿者管理工作台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">数据版本</p>
          <p className="text-sm font-medium">v2.0 正式版</p>
          <p className="text-xs text-slate-500 mt-1">最后更新: 2026-05-21</p>
        </div>
      </div>
    </aside>
  );
}
