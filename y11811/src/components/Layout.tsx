import { Outlet, NavLink } from 'react-router-dom'
import { PieChart, FileCheck, History, FileText, Home } from 'lucide-react'

const navItems = [
  { path: '/', label: '组合管理', icon: Home },
  { path: '/risk-budget', label: '风险预算', icon: PieChart },
  { path: '/audit-trail', label: '修正留痕', icon: History },
  { path: '/report', label: '报告导出', icon: FileText },
]

function Layout() {
  return (
    <div className="flex h-screen bg-neutral-bg">
      <aside className="w-64 bg-primary text-white flex flex-col shadow-lg">
        <div className="p-6 border-b border-primary-light">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileCheck className="w-6 h-6" />
            公募组合风险预算
          </h1>
          <p className="text-sm text-gray-300 mt-1">投顾助理专用</p>
        </div>

        <nav className="flex-1 py-6">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 text-sm transition-all ${
                      isActive
                        ? 'bg-primary-light text-white border-l-4 border-accent-amber'
                        : 'text-gray-300 hover:bg-primary-light/50 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-primary-light">
          <p className="text-xs text-gray-400 text-center">v1.0.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
