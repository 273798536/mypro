import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, List, ThermometerSun } from 'lucide-react'

const navItems = [
  { path: '/', label: '摘要总览', icon: LayoutDashboard },
  { path: '/records', label: '归因记录', icon: List },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-iron-950 flex">
      <aside className="w-56 shrink-0 border-r border-iron-800 bg-iron-950 flex flex-col">
        <div className="p-5 border-b border-iron-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <ThermometerSun className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-iron-50 leading-tight">热泵循环</div>
              <div className="text-[10px] text-iron-500 leading-tight">误差归因</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-iron-400 hover:text-iron-200 hover:bg-iron-800/50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-iron-800">
          <div className="text-[10px] text-iron-600">v1.0 · 纯前端本地计算</div>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
