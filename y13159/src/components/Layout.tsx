import { useStore } from '@/store'
import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  AlertTriangle,
  LineChart,
  Zap,
} from 'lucide-react'

const navItems = [
  { id: 'overview', label: '报告概览', icon: LayoutDashboard },
  { id: 'nameplate', label: '设备铭牌', icon: ClipboardList },
  { id: 'calculation', label: '计算过程', icon: Calculator },
  { id: 'anomaly', label: '异常审查', icon: AlertTriangle },
  { id: 'chart', label: '图表复核', icon: LineChart },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { activeTab, setActiveTab, data } = useStore()

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-industrial-900 border-r border-grid-line flex flex-col">
        <div className="p-5 border-b border-grid-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-500 rounded flex items-center justify-center">
              <Zap className="w-6 h-6 text-industrial-900" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base text-white leading-tight">
                热泵循环
              </h1>
              <p className="text-xs text-industrial-600 font-mono">
                REPORT.EXPORT v1.0
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-mono transition-all ${
                  isActive
                    ? 'bg-industrial-700 text-white border-l-2 border-warning-500'
                    : 'text-industrial-600 hover:text-white hover:bg-industrial-800 border-l-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {item.id === 'anomaly' && data && data.symbol_errors.length > 0 && (
                  <span className="ml-auto bg-status-red text-white text-xs px-2 py-0.5 rounded font-mono">
                    {data.symbol_errors.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-grid-line">
          <div className="text-xs text-industrial-600 font-mono space-y-1">
            <p>报告日期: {data?.meta.report_date || '--'}</p>
            <p className="cursor-blink">READY<span className="text-status-green">●</span></p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
