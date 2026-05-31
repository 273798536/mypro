import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  FileText,
  BarChart3,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: '归集仪表盘', icon: LayoutDashboard },
  { path: '/projects', label: '影片项目', icon: Film },
  { path: '/bills', label: '供应商账单', icon: FileText },
  { path: '/reports', label: '归集报告', icon: BarChart3 },
  { path: '/history', label: '调整历史', icon: History },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-amber-400">电影宣发</h1>
        <p className="text-sm text-slate-400">费用归集系统</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-slate-800 text-amber-400 shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-sm font-medium">财</span>
          </div>
          <div>
            <p className="text-sm font-medium">张会计</p>
            <p className="text-xs text-slate-400">影视财务</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
