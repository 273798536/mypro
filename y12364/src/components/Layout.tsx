import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Wind, AlertTriangle, FileText, ChevronRight } from 'lucide-react'
import { useAnomalyStore } from '@/stores/anomalyStore'
import { useEffect } from 'react'

const navItems = [
  { to: '/', label: '试验总览', icon: Wind },
  { to: '/anomalies', label: '异常追踪', icon: AlertTriangle },
]

function Breadcrumb() {
  const location = useLocation()
  const paths = location.pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    '': '试验总览',
    batch: '试验详情',
    anomalies: '异常追踪',
    report: '报告导出',
  }

  return (
    <div className="flex items-center gap-1 text-sm text-slate-400">
      <span>风洞升阻力曲线</span>
      {paths.length > 0 && (
        <>
          <ChevronRight size={14} />
          <span className="text-slate-200">{labels[paths[0]] || paths[0]}</span>
        </>
      )}
      {paths[0] === 'batch' && paths[1] && (
        <>
          <ChevronRight size={14} />
          <span className="text-slate-200">批次详情</span>
        </>
      )}
      {paths[0] === 'report' && paths[1] && (
        <>
          <ChevronRight size={14} />
          <span className="text-slate-200">报告预览</span>
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const { anomalies, fetchAnomalies } = useAnomalyStore()

  useEffect(() => {
    fetchAnomalies({ status: 'open' })
  }, [fetchAnomalies])

  const openCount = anomalies.filter((a) => a.status !== 'resolved').length

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <aside className="w-56 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-700">
          <FileText size={20} className="text-amber-500" />
          <span className="font-semibold text-slate-100">风洞升阻力曲线</span>
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-amber-500 border-r-2 border-amber-500'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.label === '异常追踪' && openCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {openCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-700 bg-slate-800/50">
          <Breadcrumb />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
