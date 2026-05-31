import { NavLink, Outlet } from 'react-router-dom';
import { Anchor, LayoutDashboard, FileText, Shield, Download, Ship } from 'lucide-react';

const navItems = [
  { to: '/', label: '减免核算', icon: LayoutDashboard },
  { to: '/rules', label: '规则管理', icon: Shield },
  { to: '/audit', label: '证据追踪', icon: FileText },
  { to: '/export', label: '账单导出', icon: Download },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-port-500 text-white flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-port-400/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Ship className="w-6 h-6 text-accent-amber" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold leading-tight">港口堆存费</h1>
              <p className="text-xs text-port-200 leading-tight">减免核算系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-port-200 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-port-400/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-amber/20 flex items-center justify-center">
              <Anchor className="w-4 h-4 text-accent-amber" />
            </div>
            <div>
              <p className="text-sm font-medium">李结算</p>
              <p className="text-xs text-port-200">港口结算员</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
