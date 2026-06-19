import { NavLink, Outlet } from 'react-router-dom'
import { Database, FileSearch, FileCode, ShieldAlert, Link, Lightbulb, Eye } from 'lucide-react'

const navItems = [
  { to: '/migration-status', label: '迁移状态', icon: Database },
  { to: '/slow-query-logs', label: '慢查询日志', icon: FileSearch },
  { to: '/migration-scripts', label: '迁移脚本', icon: FileCode },
  { to: '/backup-gaps', label: '备份缺口', icon: ShieldAlert },
  { to: '/snapshot-conclusion', label: '快照-结论', icon: Link },
  { to: '/index-suggestions', label: '索引建议', icon: Lightbulb },
  { to: '/audit-view', label: '审计视图', icon: Eye },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-900">
      <nav className="w-56 flex-shrink-0 bg-[#1e293b] border-r border-slate-700 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-slate-700">
          <Database className="w-5 h-5 text-amber-500 mr-2" />
          <span className="font-bold text-white text-lg">迁移助手</span>
        </div>
        <div className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-5 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-700 text-xs text-slate-500">
          v1.0.0
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
        <Outlet />
      </main>
    </div>
  )
}
