import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, CheckSquare, Download, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard },
  { to: '/records', label: '实验记录', icon: FileText },
  { to: '/review', label: '复核分级', icon: CheckSquare },
  { to: '/export', label: '报告导出', icon: Download },
]

const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/records': '实验记录',
  '/review': '复核分级',
  '/export': '报告导出',
}

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/analysis/')) return '配平计算与谱图判读'
  if (pathname.startsWith('/records/')) return '记录详情'
  return '土壤重金属提取报告系统'
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const currentTitle = getTitle(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[#0f172a] transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <h1 className="font-['Noto_Serif_SC'] text-lg font-bold tracking-wide text-white">
            土壤重金属报告
          </h1>
          <button
            className="text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-l-[3px] border-amber-500 bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                )
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 px-5 py-4">
          <p className="text-xs text-slate-500">土壤重金属提取报告系统 v1.0</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6 shadow-sm">
          <button
            className="text-slate-600 hover:text-slate-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h2 className="font-['Noto_Serif_SC'] text-lg font-semibold text-slate-800">
            {currentTitle}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
