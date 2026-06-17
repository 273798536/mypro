import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldAlert,
  ClipboardList,
  Workflow,
  ArrowLeftRight,
  ScanSearch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '分布统计', icon: LayoutDashboard, hint: '日常入口' },
  { to: '/quality', label: '切片质检', icon: ScanSearch, hint: '拎坏记录' },
  { to: '/reviews', label: '复核轮次', icon: ClipboardList, hint: '同轮材料' },
  { to: '/trace', label: '日志溯源', icon: Workflow, hint: '倒查链路' },
  { to: '/io', label: '导入导出', icon: ArrowLeftRight, hint: '首跑/对账' },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-700/60 bg-ink-950/60 backdrop-blur-md md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-saffron/40 bg-saffron/10 shadow-glow">
            <ShieldAlert className="h-5 w-5 text-saffron" />
          </div>
          <div>
            <div className="font-display text-base font-semibold leading-tight text-paper">
              切片质量检查
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
              forensics console
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-saffron/10 text-paper'
                      : 'text-ink-300 hover:bg-ink-800/70 hover:text-paper',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-saffron" />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-saffron' : 'text-ink-400 group-hover:text-paper',
                      )}
                    />
                    <div className="flex flex-1 flex-col leading-tight">
                      <span className="font-medium">{item.label}</span>
                      <span className="font-mono text-[10px] text-ink-400">{item.hint}</span>
                    </div>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-ink-700/60 px-5 py-4">
          <div className="font-mono text-[10px] leading-relaxed text-ink-400">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-viridian" />
              本批材料：课前材料_2026Q2
            </div>
            <div>评测题库 KB-EVAL-Q12 · 切分清单 SEG-07</div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="border-b border-ink-700/60 bg-ink-950/40 px-6 py-3 backdrop-blur-md md:px-10">
          <div className="flex items-center gap-2 overflow-x-auto font-mono text-[11px] text-ink-400">
            <span className="text-ink-300">/</span>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded px-2 py-0.5 md:hidden',
                    isActive && 'bg-saffron/10 text-saffron',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">{children}</div>
      </main>
    </div>
  )
}
