import { NavLink } from 'react-router-dom'
import { Activity, LayoutDashboard, Repeat2, GitCompareArrows } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/useUi'

const NAV = [
  { to: '/', label: '概览', icon: LayoutDashboard, hint: '复核摘要与进度' },
  { to: '/replay', label: '评测回放', icon: Repeat2, hint: '日常复核入口', accent: true },
  { to: '/versions', label: '版本追踪', icon: GitCompareArrows, hint: '月底 / 课前回看' },
]

export function Sidebar() {
  const reviewer = useUiStore((s) => s.reviewer)
  const setReviewer = useUiStore((s) => s.setReviewer)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-ink-900/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-signal/15 text-signal">
          <Activity className="h-5 w-5" strokeWidth={2.2} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-signal shadow-glow" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-sm font-semibold tracking-tight text-zinc-100">
            奖励模型偏差复核
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Reward Model · Bias Review
          </div>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                isActive ? 'bg-white/5 text-zinc-100' : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-signal transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <item.icon
                  className={cn('mt-0.5 h-4 w-4 shrink-0', item.accent && 'text-signal')}
                  strokeWidth={2}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-[11px] text-zinc-500">{item.hint}</span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <label className="label mb-1.5">当前复核人</label>
        <input
          className="input font-mono text-xs"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="platform-engineer"
        />
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
          复核人将写入结论记录，便于回看人工反馈。
        </p>
      </div>
    </aside>
  )
}
