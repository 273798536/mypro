import { NavLink, Outlet } from 'react-router-dom';
import { Waves, LayoutDashboard, ClipboardCheck, Map, PenLine, FileDown } from 'lucide-react';

const navItems = [
  { to: '/', label: '工作台', icon: LayoutDashboard },
  { to: '/review', label: '样本复核', icon: ClipboardCheck },
  { to: '/map', label: '地图联动', icon: Map },
  { to: '/log', label: '日志补录', icon: PenLine },
  { to: '/export', label: '导出报告', icon: FileDown },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-deep-sea border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center h-14 px-4">
          <div className="flex items-center gap-2 mr-8">
            <Waves className="w-6 h-6 text-warning-amber" />
            <span className="text-lg font-bold tracking-wide text-white">
              赤潮监测样本复核
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-sm rounded-t transition-colors relative ${
                    isActive
                      ? 'text-warning-amber bg-slate-800/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/30'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-warning-amber" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
