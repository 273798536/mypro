import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileUp, ClipboardCheck, FileDown, User, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store'
import Toast from './Toast'

const navItems = [
  { to: '/', label: '工作台', icon: LayoutDashboard },
  { to: '/import', label: '谱图导入', icon: FileUp },
  { to: '/review', label: '复核审批', icon: ClipboardCheck },
  { to: '/export', label: '报告导出', icon: FileDown },
]

const breadcrumbMap: Record<string, string> = {
  '/': '工作台',
  '/import': '谱图导入',
  '/review': '复核审批',
  '/export': '报告导出',
}

export default function Layout() {
  const { currentRole, setCurrentRole } = useAppStore()
  const location = useLocation()
  const basePath = '/' + location.pathname.split('/')[1]
  const breadcrumbLabel = location.pathname.startsWith('/attribution')
    ? '碎片归因'
    : breadcrumbMap[basePath] || ''

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <aside className="w-60 flex-shrink-0 bg-indigo-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-indigo-700">
          <h1 className="font-serif text-lg font-semibold tracking-wide">
            质谱碎片归因助手
          </h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-indigo-700">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-200">
            <User size={16} />
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as 'material_engineer' | 'quality_supervisor')}
              className="bg-indigo-800 text-white text-sm rounded px-2 py-1 border border-indigo-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="material_engineer">材料工程师</option>
              <option value="quality_supervisor">质检主管</option>
            </select>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-6">
          <nav className="flex items-center text-sm text-cool-gray">
            <span className="text-indigo-900 font-medium">质谱碎片归因助手</span>
            <ChevronRight size={14} className="mx-2" />
            <span>{breadcrumbLabel}</span>
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <Toast />
    </div>
  )
}
