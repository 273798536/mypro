import { NavLink } from 'react-router-dom';
import { Home, Music, BarChart3, Users } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: '反馈管理', icon: Home },
  { path: '/segments', label: '曲目段落', icon: Music },
  { path: '/analytics', label: '数据分析', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="font-bold text-lg">音效反馈</h1>
            <p className="text-xs text-slate-400">演唱会座位系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-amber-500 text-slate-900 font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">运</span>
          </div>
          <div>
            <p className="text-sm font-medium">运营人员</p>
            <p className="text-xs text-slate-400">在线</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
