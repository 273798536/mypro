import { Outlet, NavLink } from 'react-router-dom'
import { List, FileText, Users } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { UserRole } from '@/types'

const roles: { key: UserRole; label: string }[] = [
  { key: 'inspector', label: '巡检人员' },
  { key: 'teacher', label: '教学老师' },
  { key: 'handover', label: '交接班' },
]

export default function Layout() {
  const userRole = useStore((s) => s.userRole)
  const setUserRole = useStore((s) => s.setUserRole)

  return (
    <div className="flex h-screen bg-museum-bg">
      <aside className="w-64 bg-museum-surface border-r border-museum-border flex flex-col shrink-0">
        <div className="p-6 border-b border-museum-border">
          <h1 className="font-serif text-xl font-semibold text-museum-amber leading-tight">
            博物馆展柜
          </h1>
          <p className="text-sm text-museum-textMuted mt-1">灯光时序回放系统</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/records"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-museum-amber/10 text-museum-amber'
                  : 'text-museum-textMuted hover:bg-museum-card hover:text-museum-text'
              }`
            }
          >
            <List size={18} />
            时序列表
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-museum-amber/10 text-museum-amber'
                  : 'text-museum-textMuted hover:bg-museum-card hover:text-museum-text'
              }`
            }
          >
            <FileText size={18} />
            报告中心
          </NavLink>
        </nav>

        <div className="p-4 border-t border-museum-border">
          <div className="flex items-center gap-2 mb-3 text-xs text-museum-textDim">
            <Users size={14} />
            当前角色
          </div>
          <div className="space-y-1">
            {roles.map((r) => (
              <button
                key={r.key}
                onClick={() => setUserRole(r.key)}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                  userRole === r.key
                    ? 'bg-museum-amber text-museum-bg font-medium'
                    : 'text-museum-textMuted hover:bg-museum-card'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  )
}
