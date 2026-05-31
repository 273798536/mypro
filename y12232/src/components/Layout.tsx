import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import {
  Upload,
  CheckSquare,
  ClipboardCheck,
  Download,
  BookOpen,
  Tractor,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '数据导入', icon: Upload },
  { path: '/verify', label: '面积核验', icon: CheckSquare },
  { path: '/review', label: '人工复核', icon: ClipboardCheck },
  { path: '/export', label: '导出管理', icon: Download },
  { path: '/guide', label: '使用说明', icon: BookOpen },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const currentUser = useAppStore((s) => s.currentUser)

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          'flex flex-col bg-primary text-white transition-all duration-300 ease-in-out shrink-0',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        <div className={cn('flex items-center gap-3 px-4 h-16 border-b border-white/10', collapsed && 'justify-center px-0')}>
          <Tractor className="w-7 h-7 text-warning shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-serif font-semibold leading-tight truncate">农机补贴核验</h1>
              <p className="text-[10px] text-primary-200 leading-tight truncate">作业面积核验系统</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200',
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-primary-200 hover:bg-white/10 hover:text-white',
                  collapsed && 'justify-center px-0'
                )
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={cn('border-t border-white/10 px-3 py-3', collapsed && 'px-1')}>
          <div className={cn('flex items-center gap-2 px-2', collapsed && 'justify-center px-0')}>
            <User className="w-4 h-4 shrink-0 text-primary-200" />
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs text-white truncate">{currentUser.username}</p>
                <p className="text-[10px] text-primary-300 truncate">
                  {currentUser.role === 'operator' ? '操作员' : '复核员'}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-white/10 text-primary-200 hover:text-white hover:bg-white/10 transition-colors duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
