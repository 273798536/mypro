import { useLocation, useNavigate } from 'react-router-dom'
import { Box, MessageSquare, FileDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/store/useStore'

const navItems = [
  { path: '/', icon: Box, label: '场景预审' },
  { path: '/annotations', icon: MessageSquare, label: '批注管理' },
  { path: '/export', icon: FileDown, label: '导出报告' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = useStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const collisionCount = useStore((s) => s.collisions.filter(c => c.status === 'collision').length)

  return (
    <div className={`flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ${collapsed ? 'w-14' : 'w-48'}`}>
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-200 whitespace-nowrap">碰撞预审</span>
          </div>
        )}
        <button onClick={toggleSidebar} className="p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 py-2 space-y-1 px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-left ${
                active
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
              }`}
              title={label}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="text-xs whitespace-nowrap">{label}</span>}
            </button>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">碰撞数</span>
            <span className="text-xs font-bold text-red-400">{collisionCount}</span>
          </div>
        </div>
      )}
    </div>
  )
}
