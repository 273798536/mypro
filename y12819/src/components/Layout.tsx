import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  FlaskConical,
  BarChart3,
  AlertTriangle,
  Route,
  FileDown,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard },
  { to: '/records', label: '培养记录', icon: FlaskConical },
  { to: '/statistics', label: '分组统计', icon: BarChart3 },
  { to: '/anomalies', label: '异常复核', icon: AlertTriangle },
  { to: '/trajectory', label: '轨迹可视化', icon: Route },
  { to: '/export', label: '导出报告', icon: FileDown },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-slate-100 font-body">
      <aside
        className={`${
          collapsed ? 'w-0' : 'w-60'
        } fixed left-0 top-0 h-full bg-slate-800 text-slate-300 z-30 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-700 px-4 shrink-0">
          <h1 className="font-title text-lg text-amber-400 font-semibold truncate">
            动物行为轨迹分析
          </h1>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 border-l-3 border-amber-400'
                    : 'hover:bg-slate-700 hover:text-slate-100'
                }`
              }
            >
              <item.icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center shrink-0">
          v1.0.0
        </div>
      </aside>

      <div className={`${collapsed ? 'ml-0' : 'ml-60'} flex-1 flex flex-col transition-all duration-300`}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 shadow-sm">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
          <span className="ml-4 font-title text-lg text-slate-800">
            动物行为轨迹分析
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
