import { NavLink, Outlet } from 'react-router-dom'
import { AlertTriangle, Building2, FileText } from 'lucide-react'

const navItems = [
  { to: '/warnings', label: '预警清单', icon: AlertTriangle },
  { to: '/suppliers', label: '供应商档案', icon: Building2 },
  { to: '/contracts', label: '采购合同', icon: FileText },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className="w-56 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-zinc-800">
          <h1 className="text-base font-bold tracking-tight text-zinc-50">保函到期预警</h1>
          <p className="text-xs text-zinc-500 mt-1">供应商管理系统</p>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-50 font-medium border-r-2 border-red-500'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">当前操作员：演示用户</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
