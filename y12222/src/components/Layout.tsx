import { Outlet, NavLink } from 'react-router-dom'
import { Home, FileText, Receipt, CheckSquare, Eye, FileBarChart, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Layout() {
  const navItems = [
    { path: '/', icon: Home, label: '仪表盘' },
    { path: '/expenditures', icon: FileText, label: '支出申请' },
    { path: '/invoices', icon: Receipt, label: '发票管理' },
    { path: '/approvals', icon: CheckSquare, label: '审批追踪' },
    { path: '/disclosures', icon: Eye, label: '公示管理' },
    { path: '/reports', icon: FileBarChart, label: '导出报告' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-teal-400">社区基金管理</h1>
          <p className="text-sm text-slate-400 mt-1">支出公示系统</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-teal-700 text-white border-r-4 border-teal-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => {
              if (confirm('确定要重置数据库吗？所有数据将恢复为初始状态。')) {
                fetch('/api/db/reset').then(() => window.location.reload())
              }
            }}
            className="flex items-center gap-2 px-4 py-2 w-full text-sm text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-800"
          >
            <Database size={16} />
            重置数据
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
