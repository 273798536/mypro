import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, BarChart3, ShieldCheck, Download, Target, RotateCcw } from 'lucide-react'
import { useStore } from '@/store/useStore'

const navItems = [
  { to: '/', label: '评分面板', icon: ClipboardList },
  { to: '/ranking', label: '排名看板', icon: BarChart3 },
  { to: '/audit', label: '溯源与审计', icon: ShieldCheck },
  { to: '/export', label: '导出中心', icon: Download },
]

export default function Layout() {
  const resetToSample = useStore((s) => s.resetToSample)

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-slate-900">
        <div className="flex items-center gap-3 px-5 py-6">
          <Target className="h-7 w-7 text-amber-400" />
          <h1 className="text-lg font-bold text-white">多目标评分排序器</h1>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-3">
          <button
            onClick={resetToSample}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            重置示例数据
          </button>
        </div>
      </aside>

      <main className="ml-60 min-h-screen bg-slate-50">
        <Outlet />
      </main>
    </div>
  )
}
