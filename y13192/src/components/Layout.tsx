import { NavLink, Outlet } from 'react-router-dom'
import { Battery, FileSearch, Calculator, ClipboardList } from 'lucide-react'

const navItems = [
  { to: '/', label: '参数回放', icon: Battery },
  { to: '/trace', label: '材料溯源', icon: FileSearch },
  { to: '/recalc', label: '参数复算', icon: Calculator },
  { to: '/queue', label: '异常队列', icon: ClipboardList },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f0f23' }}>
      <nav className="flex w-56 shrink-0 flex-col border-r border-gray-800" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center gap-2 border-b border-gray-800 px-5 py-4">
          <Battery className="h-6 w-6 text-amber-500" />
          <span className="text-base font-bold text-white">内阻参数回放</span>
        </div>
        <div className="flex-1 py-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border-r-2 border-amber-500'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="border-t border-gray-800 px-5 py-3 text-xs text-gray-600">
          电池内阻参数回放系统 v1.0
        </div>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
