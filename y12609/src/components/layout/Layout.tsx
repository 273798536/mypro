import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Palette, Download } from 'lucide-react';

export function Layout() {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: '工作台' },
    { path: '/samples', icon: FileText, label: '样例管理' },
    { path: '/rules', icon: Palette, label: '颜色规则' },
    { path: '/export', icon: Download, label: '报告导出' }
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="h-14 bg-slate-900 text-white flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
            <span className="font-mono font-bold text-sm">热</span>
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm tracking-wide">仓库拣货热区平面图系统</h1>
            <p className="text-[10px] text-slate-400 font-mono">Warehouse Picking Hotzone Mapping System</p>
          </div>
        </div>

        <nav className="ml-12 flex items-center gap-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `
                flex items-center gap-2 px-4 py-2 rounded text-xs font-mono transition-all
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
              `}
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">
            赛事运营专用 · v1.0.0
          </span>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-mono">运</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
