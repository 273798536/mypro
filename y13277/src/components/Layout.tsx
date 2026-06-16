import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, AlertTriangle, HelpCircle, BookOpen } from 'lucide-react'
import GuideModal from './GuideModal'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [guideOpen, setGuideOpen] = useState(false)

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/replay', icon: AlertTriangle, label: '回放' },
    { path: '/help', icon: HelpCircle, label: '帮助' },
  ]

  const getStatusColor = (path: string) => {
    return location.pathname === path ? 'text-fire-orange' : 'text-fire-white/60'
  }

  const getBgColor = (path: string) => {
    return location.pathname === path ? 'bg-fire-orange/10' : 'hover:bg-caliber-blue/50'
  }

  return (
    <div className="flex h-screen bg-fire-deep overflow-hidden">
      <aside className="w-[240px] bg-caliber-blue/90 flex flex-col border-r border-fire-orange/20">
        <div className="p-6 border-b border-fire-orange/20">
          <h1 className="text-xl font-bold text-fire-white font-serif flex items-center gap-2">
            <span className="w-2 h-2 bg-fire-orange rounded-full animate-pulse" />
            老街消防投诉回放
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${getBgColor(item.path)} ${getStatusColor(item.path)}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-fire-orange/20 text-center">
          <p className="text-fire-white/40 text-sm">v1.0.0</p>
          <p className="text-fire-white/30 text-xs mt-1">© 2026 老街消防</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-caliber-blue/50 border-b border-fire-orange/20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-fire-white/80 text-lg">
              {navItems.find(item => item.path === location.pathname)?.label || '系统'}
            </h2>
          </div>
          <button
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-fire-orange/10 hover:bg-fire-orange/20 text-fire-orange rounded-lg transition-all duration-300 border border-fire-orange/30"
          >
            <BookOpen size={18} />
            <span>操作指引</span>
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
