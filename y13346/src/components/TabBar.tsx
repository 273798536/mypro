import { BarChart3, FileSearch, History, AlertOctagon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import clsx from 'clsx'

const tabs = [
  { id: 'chart', label: '灰度对比图', icon: BarChart3 },
  { id: 'detail', label: '审查明细', icon: FileSearch },
  { id: 'history', label: '变更历史', icon: History },
  { id: 'exceptions', label: '异常队列', icon: AlertOctagon },
] as const

export default function TabBar() {
  const selectedTab = useAppStore((s) => s.selectedTab)
  const setSelectedTab = useAppStore((s) => s.setSelectedTab)
  const exceptionCount = useAppStore((s) => s.exceptionQueue.filter((e) => e.status !== 'resolved').length)

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = selectedTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={clsx(
                  'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  active ? 'text-brand-600' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === 'exceptions' && exceptionCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold">
                    {exceptionCount}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
