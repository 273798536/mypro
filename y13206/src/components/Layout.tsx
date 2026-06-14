import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FileText, Download } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: '排期总览', icon: LayoutDashboard },
  { to: '/contracts', label: '合同管理', icon: FileText },
  { to: '/export', label: '导出校验', icon: Download },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#1a1a2e' }}>
      <nav className="hidden md:flex w-56 flex-col border-r border-[#3a3a55] bg-[#16162a]">
        <div className="px-5 py-6">
          <h1
            className="text-lg font-bold text-[#f0a500]"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            录音棚排期
          </h1>
          <p className="mt-1 text-xs text-[#e8e8e8]/40">时码冲突管理系统</p>
        </div>
        <div className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#f0a500]/15 text-[#f0a500]'
                    : 'text-[#e8e8e8]/60 hover:bg-[#2d2d44] hover:text-[#e8e8e8]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="border-t border-[#3a3a55] px-5 py-4">
          <p className="text-xs text-[#e8e8e8]/30">林姐的录音棚</p>
        </div>
      </nav>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[#3a3a55] bg-[#16162a] px-4 py-3 md:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? 'bg-[#f0a500]/15 text-[#f0a500]'
                    : 'text-[#e8e8e8]/60'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
