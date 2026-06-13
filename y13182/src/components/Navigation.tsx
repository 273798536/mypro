import { NavLink } from 'react-router-dom'
import { Activity, AlertTriangle } from 'lucide-react'

export default function Navigation() {
  return (
    <nav
      className="flex h-14 items-center gap-6 border-b border-slate-700/60 px-6"
      style={{ background: '#0f172a' }}
    >
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-amber-500" />
        <span
          className="text-sm font-bold text-slate-200"
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          冷却塔水滴参数回放
        </span>
      </div>

      <div className="flex items-center gap-1 ml-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          <Activity className="h-3.5 w-3.5" />
          参数回放
        </NavLink>
        <NavLink
          to="/anomalies"
          className={({ isActive }) =>
            `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`
          }
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          异常队列
        </NavLink>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span
          className="text-[10px] text-slate-600"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          v1.0
        </span>
      </div>
    </nav>
  )
}
