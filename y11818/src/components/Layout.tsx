import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/hooks/useStore'
import Notification from './Notification'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const notifications = useAppStore((s) => s.notifications)
  const removeNotification = useAppStore((s) => s.removeNotification)

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: '工作台' },
    { path: '/pending-export', icon: ClipboardCheck, label: '待确认区' },
  ]

  return (
    <div className="flex min-h-screen bg-[#1A1A2E]">
      <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-border bg-[#151525]">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-medical-teal" />
            <h1 className="text-xl font-bold text-soft-white">退款拆账</h1>
          </div>
        </div>
        <nav className="mt-2 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-medical-teal/15 text-medical-teal border-l-2 border-medical-teal'
                    : 'text-soft-white/60 hover:bg-charcoal-light hover:text-soft-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <main className="ml-60 flex-1">{children}</main>
      {notifications.length > 0 && (
        <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
          {notifications.map((n) => (
            <Notification key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
