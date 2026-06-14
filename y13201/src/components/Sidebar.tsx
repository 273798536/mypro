import { NavLink } from 'react-router-dom'
import {
  AlertTriangle,
  Music2,
  FileEdit,
  FileDown,
  Headphones,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: '冲突总览', icon: AlertTriangle, end: true },
  { to: '/tracks', label: '曲目表', icon: Music2 },
  { to: '/notes', label: '备注编辑', icon: FileEdit },
  { to: '/export', label: '导出清单', icon: FileDown },
]

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-violet-500/10 bg-slate-950/40 backdrop-blur-xl">
      <div className="h-full flex flex-col">
        <div className="px-6 pt-8 pb-6 border-b border-violet-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl text-white">巡演耳返</h1>
              <p className="text-[11px] text-violet-300/70 tracking-wider">
                CONFLICT MANAGER
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-violet-500/25 to-amber-500/10 text-white shadow-inner border border-violet-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent',
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-violet-500/10">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="text-xs text-emerald-300 font-medium">数据已同步</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              所有备注、授权状态与导出清单实时对齐，重启不丢失。
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
