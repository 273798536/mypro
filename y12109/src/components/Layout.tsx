import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ShieldAlert } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface text-gray-200">
      <nav className="border-b border-surface-200 bg-surface-50/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <span className="font-mono font-semibold text-white tracking-tight">MC-Sim</span>
            <span className="text-xs text-gray-500 font-mono ml-1">蒙特卡洛保费模拟</span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-200/50'
                }`
              }
            >
              模拟工作台
            </NavLink>
            <NavLink
              to="/diagnostics"
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-200/50'
                }`
              }
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              风险诊断
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
