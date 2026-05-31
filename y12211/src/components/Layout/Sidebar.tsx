import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Ticket,
  ShoppingBag,
  FileSpreadsheet,
  AlertTriangle,
  DollarSign,
  GitBranch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/orders', label: '票务订单', icon: Ticket },
  { path: '/derivatives', label: '衍生品销售', icon: ShoppingBag },
  { path: '/rules', label: '分账规则', icon: FileSpreadsheet },
  { path: '/exceptions', label: '异常中心', icon: AlertTriangle },
  { path: '/revenue', label: '收入归集', icon: DollarSign },
  { path: '/trace', label: '追溯查询', icon: GitBranch },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <div className="w-60 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">艺术展票务分账</h1>
        <p className="text-slate-400 text-sm mt-1">Art Exhibition Revenue Split</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path))
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white border-r-4 border-amber-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-medium">
            财
          </div>
          <div>
            <p className="text-sm font-medium">财务主管</p>
            <p className="text-xs text-slate-400">admin@art-expo.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
