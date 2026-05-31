import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, GitBranch, Download } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: '分析看板', icon: LayoutDashboard },
  { path: '/annotations', label: '批注管理', icon: FileText },
  { path: '/parts', label: '声部对账', icon: Users },
  { path: '/trace', label: '追溯查询', icon: GitBranch },
  { path: '/export', label: '导出中心', icon: Download },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-xl font-serif">♪</span>
              </div>
              <div>
                <h1 className="text-xl font-serif tracking-wide">曲谱排练批注同步</h1>
                <p className="text-xs text-slate-300">管弦乐团谱务管理系统</p>
              </div>
            </div>
            <div className="text-sm text-slate-300">
              <span className="text-amber-400">●</span> 实时同步中
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="min-h-[600px]">
          <Outlet />
        </main>

        <footer className="mt-12 py-6 border-t border-slate-200 text-center text-sm text-slate-500">
          <p>曲谱排练批注同步系统 · 让每一份乐谱都准确送达</p>
        </footer>
      </div>
    </div>
  );
}
