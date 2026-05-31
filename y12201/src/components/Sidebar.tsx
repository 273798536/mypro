import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  FileCheck,
  AlertTriangle,
  ClipboardList,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: '总览' },
  { to: '/orders', icon: ShoppingCart, label: '订单管理' },
  { to: '/reconciliation', icon: FileCheck, label: '账单核对' },
  { to: '/exceptions', icon: AlertTriangle, label: '异常处理' },
  { to: '/audit-trail', icon: ClipboardList, label: '审计日志' },
  { to: '/reports', icon: FileBarChart, label: '报表导出' },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-navy-500 text-white flex flex-col transition-all duration-300 z-40',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className={cn('flex items-center h-16 px-4 border-b border-navy-400', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
        {!sidebarCollapsed && (
          <h1 className="text-lg font-serif tracking-wide">VAT预提</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-navy-400 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-navy-200 hover:bg-white/10 hover:text-white',
                sidebarCollapsed && 'justify-center px-0'
              )
            }
          >
            <item.icon size={20} />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={cn('px-4 py-4 border-t border-navy-400', sidebarCollapsed ? 'text-center' : '')}>
        {!sidebarCollapsed && (
          <p className="text-xs text-navy-300">跨境电商VAT预提系统</p>
        )}
      </div>
    </aside>
  )
}
