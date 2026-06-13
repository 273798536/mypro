import { Outlet, NavLink } from 'react-router-dom'
import { Waves, GitBranch, RefreshCw } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-sky-400" />
          <span className="font-semibold text-slate-100">海浪浮标参数回放</span>
        </div>
        <nav className="flex gap-1 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-slate-700 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`
            }
          >
            <Waves className="w-3.5 h-3.5" />
            参数回放
          </NavLink>
          <NavLink
            to="/causal-chain"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-slate-700 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`
            }
          >
            <GitBranch className="w-3.5 h-3.5" />
            改判因果链
          </NavLink>
          <NavLink
            to="/recalc"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-slate-700 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`
            }
          >
            <RefreshCw className="w-3.5 h-3.5" />
            复算验证
          </NavLink>
        </nav>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
