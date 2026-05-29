import { NavLink, Outlet } from 'react-router-dom'
import { useAppStore } from '@/store'
import {
  LayoutDashboard,
  Shield,
  FileText,
  Upload,
  Search,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Leaf,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/margin', label: '保证金管理', icon: Shield },
  { path: '/orders', label: '交易订单', icon: FileText },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/audit', label: '审计追溯', icon: Search },
  { path: '/reports', label: '报告导出', icon: FileDown },
]

export default function Layout() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 shadow-sm">
            <Leaf className="w-4.5 h-4.5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-display font-bold text-sm text-slate-800 whitespace-nowrap">碳配额保证金</h1>
              <p className="text-[10px] text-slate-400 whitespace-nowrap">交易保证金管理系统</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center h-10 border-t border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
