import { NavLink } from 'react-router-dom'
import {
  Home,
  Layers,
  Camera,
  Briefcase,
  GitCompare,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

const navItems = [
  { path: '/', name: '首页', icon: Home },
  { path: '/presets', name: '预设管理', icon: Layers },
  { path: '/snapshots', name: '参数快照', icon: Camera },
  { path: '/assignments', name: '作业管理', icon: Briefcase },
  { path: '/compare', name: '版本对比', icon: GitCompare },
  { path: '/sandbox', name: '测试沙箱', icon: FlaskConical },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold text-foreground">音色预设库</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Layers className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {sidebarCollapsed && (
        <div className="flex justify-center p-2">
          <button
            onClick={toggleSidebar}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary glow-effect'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-2'
                )
              }
              title={sidebarCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20">
              <span className="text-xs font-medium text-secondary">师</span>
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-foreground">张老师</p>
              <p className="text-xs text-muted-foreground">电子音乐教室</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
