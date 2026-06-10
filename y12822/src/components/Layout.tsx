import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileSearch, ClipboardList, Download, BookOpen, Dna } from 'lucide-react'

const navItems = [
  { to: '/', label: '候选表总览', icon: LayoutDashboard },
  { to: '/audit', label: '审计日志', icon: ClipboardList },
  { to: '/export', label: '数据导出', icon: Download },
  { to: '/guide', label: '说明文档', icon: BookOpen },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-zinc-50">
      <aside className="w-60 flex-shrink-0 bg-teal-800 text-white flex flex-col">
        <div className="px-5 py-6 border-b border-teal-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">CRISPR 脱靶候选表</h1>
              <p className="text-xs text-teal-300 mt-0.5">可追溯管理系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.to === '/'
              ? location.pathname === '/' || location.pathname.startsWith('/candidate/')
              : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white font-medium'
                    : 'text-teal-200 hover:bg-teal-700 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-teal-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-xs font-medium">
              生
            </div>
            <div>
              <p className="text-xs font-medium">生信分析师</p>
              <p className="text-xs text-teal-300">在线</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
