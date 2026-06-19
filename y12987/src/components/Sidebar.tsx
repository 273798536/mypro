import { NavLink, useLocation } from 'react-router-dom'
import { Network, ClipboardList, ShieldCheck, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const navItems = [
  { path: '/', label: '拓扑看板', icon: Network },
  { path: '/workorders', label: '业务工单', icon: ClipboardList },
  { path: '/audit', label: '审计日志', icon: ShieldCheck },
  { path: '/guide', label: '操作指南', icon: BookOpen },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()
  const location = useLocation()

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-brand-surface border-r border-brand-border flex flex-col transition-all duration-300 z-50 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-brand-border shrink-0">
        {!sidebarCollapsed && (
          <div className="animate-fade-in">
            <h1 className="text-sm font-semibold text-brand-text tracking-wide">ETL 拓扑管理</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">依赖拓扑 · 工单追踪 · 审计留痕</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-brand-elevated text-brand-muted hover:text-brand-text transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-elevated text-brand-text shadow-sm'
                  : 'text-brand-muted hover:text-brand-text hover:bg-brand-elevated/50'
              }`}
            >
              <item.icon size={18} className={`shrink-0 ${isActive ? 'text-brand-info' : ''}`} />
              {!sidebarCollapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 pb-4">
        {!sidebarCollapsed && (
          <div className="animate-fade-in text-[10px] text-brand-muted/60 px-1">
            v1.0.0 · 单一数据源
          </div>
        )}
      </div>
    </aside>
  )
}
