import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Clock,
  History,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useStore from '@/store/app'

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/contracts', label: '借款合同', icon: FileText },
  { path: '/extensions', label: '展期申请', icon: Clock },
  { path: '/audit-trail', label: '审批留痕', icon: History },
  { path: '/risk-detection', label: '风险检测', icon: AlertTriangle },
  { path: '/export', label: '导出中心', icon: Download },
]

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { currentUser } = useStore()

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className={cn(
        'flex flex-col bg-deep-slate text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
          {!collapsed && (
            <span className="font-serif text-lg font-semibold text-white">展期审批</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 my-1 rounded-md transition-all',
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon size={20} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
              <User size={16} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-slate-800 font-serif">
            {navItems.find(item => item.path === location.pathname)?.label || '工作台'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
