import { Outlet, NavLink } from 'react-router-dom'
import { LayoutList, GitBranch, FileText, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useAppStore } from '@/store'

const navItems = [
  { to: '/queue', label: '兑付队列', icon: LayoutList },
  { to: '/events', label: '事件流', icon: GitBranch },
  { to: '/report', label: '队列报告', icon: FileText },
]

export default function Layout() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-navy text-white transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-4">
          {!sidebarCollapsed && (
            <h1 className="font-serif text-lg font-semibold tracking-wide">
              商票兑付优先队列
            </h1>
          )}
          <button
            onClick={toggleSidebar}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
          >
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-amber'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          {!sidebarCollapsed && (
            <p className="text-xs text-white/40">商票兑付优先队列管理系统</p>
          )}
        </div>
      </aside>

      <main
        className={`flex flex-1 flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-card px-6">
          <div className="flex items-center gap-2 text-sm text-slate_text">
            <span className="h-2 w-2 rounded-full bg-emerald" />
            系统运行中
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
