import { Link, useLocation } from 'react-router-dom'
import {
  LayoutList,
  History,
  Download,
  Trophy,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '奖金发放', icon: LayoutList },
  { path: '/history', label: '修正历史', icon: History },
  { path: '/download', label: '导出下载', icon: Download },
]

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-[#0f0f1a] text-white">
      <aside className="w-64 bg-[#1a1a2e] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">赛事奖金</h1>
              <p className="text-xs text-gray-400">税后发放工作台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            <p>赛事运营财务系统</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
