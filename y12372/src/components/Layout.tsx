import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Music, Upload, FileEdit, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const navItems = [
  { key: 'overview', label: '版税总览', icon: LayoutDashboard, path: '/' },
  { key: 'works', label: '作品列表', icon: Music, path: '/works' },
  { key: 'import', label: '数据导入', icon: Upload, path: '/import' },
  { key: 'corrections', label: '修正与申诉', icon: FileEdit, path: '/corrections' },
  { key: 'reports', label: '报告导出', icon: FileText, path: '/reports' },
]

const pageTitles: Record<string, string> = {
  '/': '版税总览',
  '/works': '作品列表',
  '/import': '数据导入',
  '/corrections': '修正与申诉',
  '/reports': '报告导出',
}

export default function Layout() {
  const { sidebarCollapsed, setSidebarCollapsed, setCurrentPage } = useStore()
  const location = useLocation()
  const navigate = useNavigate()

  const currentTitle = pageTitles[location.pathname] || (location.pathname.startsWith('/works/') ? '作品详情' : '版税总览')

  const handleNav = (item: typeof navItems[number]) => {
    setCurrentPage(item.key)
    navigate(item.path)
  }

  const isActive = (item: typeof navItems[number]) => {
    if (item.path === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.path)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <aside
        className={cn(
          'flex flex-col border-r transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
        style={{ backgroundColor: 'var(--ink-blue)', borderColor: 'var(--border-color)' }}
      >
        <div className={cn('flex h-14 items-center border-b px-4', sidebarCollapsed ? 'justify-center' : 'justify-between')} style={{ borderColor: 'var(--border-color)' }}>
          {!sidebarCollapsed && (
            <h1 className="font-serif-sc text-base font-semibold" style={{ color: 'var(--amber-gold)' }}>
              版税追踪
            </h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-md p-1.5 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 py-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item)}
                className={cn(
                  'flex w-full items-center gap-3 transition-colors duration-150',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-5 py-2.5',
                  active ? 'border-r-2' : 'border-r-2 border-transparent'
                )}
                style={{
                  color: active ? 'var(--amber-gold)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'rgba(212, 168, 83, 0.08)' : 'transparent',
                  borderColor: active ? 'var(--amber-gold)' : 'transparent',
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 items-center border-b px-6"
          style={{ backgroundColor: 'var(--ink-blue)', borderColor: 'var(--border-color)' }}
        >
          <h2 className="font-serif-sc text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {currentTitle}
          </h2>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
