import { NavLink, Outlet } from 'react-router-dom'
import {
  GitBranch,
  Layers,
  AlertTriangle,
  Camera,
  FileText,
  MapPin,
  Bot,
} from 'lucide-react'
import ToastContainer from './ToastContainer'

const navItems = [
  { to: '/', label: '分析主页', icon: GitBranch, end: true },
  { to: '/overlap', label: '对象重叠处理', icon: AlertTriangle },
  { to: '/review', label: '评审回溯', icon: Camera },
  { to: '/report', label: '交接报告', icon: FileText },
  { to: '/handover', label: '接手导航', icon: MapPin },
]

export default function Layout() {
  return (
    <div className="flex h-full w-full">
      <aside className="w-56 flex-shrink-0 bg-engineer-800 text-engineer-50 flex flex-col">
        <div className="px-5 py-5 border-b border-engineer-700 flex items-center gap-2">
          <Bot className="w-6 h-6 text-engineer-300" />
          <div>
            <div className="text-sm font-semibold tracking-wide">剖面讲解分析</div>
            <div className="text-[11px] text-engineer-400 font-mono">XX医院 B1层</div>
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 ${
                  isActive
                    ? 'bg-engineer-700/60 border-engineer-300 text-white'
                    : 'border-transparent text-engineer-200 hover:bg-engineer-700/40 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-engineer-700 text-[11px] text-engineer-400 font-mono">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>图层 4 / 判断 4</span>
          </div>
          <div>方案经理 · 小赵</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative">
        <Outlet />
        <ToastContainer />
      </main>
    </div>
  )
}
