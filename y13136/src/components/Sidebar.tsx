import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, GitCompare, FileOutput, Atom } from 'lucide-react';

const navItems = [
  { path: '/', label: '校验工作台', icon: LayoutDashboard },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/compare', label: '参数对照', icon: GitCompare },
  { path: '/delivery', label: '交付视图', icon: FileOutput },
];

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Atom className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100">边界校验</h1>
          <p className="text-[10px] text-slate-500">Markov Chain Checker</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
                isActive
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <item.icon className="w-4 h-4" strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500">投研助理 · 阿乔</div>
        <div className="text-[10px] text-slate-600 mt-1">v0.1.0 · 本地模式</div>
      </div>
    </aside>
  );
}
