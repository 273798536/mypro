import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Database,
  Clock,
  AlertTriangle,
  FileDown,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '误差图表', icon: BarChart3 },
  { path: '/records', label: '数据记录', icon: Database },
  { path: '/history', label: '筛选历史', icon: Clock },
  { path: '/diagnosis', label: '异常诊断', icon: AlertTriangle },
  { path: '/export', label: '导出报告', icon: FileDown },
]

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={`bg-primary-900 text-white h-screen flex flex-col transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`p-6 border-b border-primary-700 ${collapsed ? 'text-center' : ''}`}>
        <h1 className={`font-serif font-bold ${collapsed ? 'text-xl' : 'text-2xl'}`}>
          {collapsed ? 'MC' : '蒙特卡洛'}
        </h1>
        {!collapsed && (
          <p className="text-xs text-primary-300 mt-1">误差图表解释工具</p>
        )}
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-700 text-white shadow-inner'
                      : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} strokeWidth={1.5} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-primary-700">
          <div className="text-xs text-primary-400">
            <p>数据分析员：小孟</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  )
}
