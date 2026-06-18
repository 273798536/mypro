import { NavLink, useLocation } from 'react-router-dom'
import { BookOpenCheck, Scale, ClipboardList, Stamp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useReviewStore } from '@/store/useReviewStore'

const NAV = [
  { to: '/workbench', label: '复核工作台', sub: '工单 · 样本证据 · 改判', icon: BookOpenCheck },
  { to: '/analytics', label: '改判评审', sub: '总指标 · 样本下钻 · 冲突隔离', icon: Scale },
  { to: '/ledger', label: '处理台帐与交付', sub: '已处理 · 待补证据 · 交付说明', icon: ClipboardList },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { orders, samples } = useReviewStore()
  const conflictCount = samples.filter((s) => s.hasLabelConflict).length
  const needsCount = orders.filter((o) => o.status === 'needs_evidence').length

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-ink-900/15 bg-paper-100/70 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 border-b border-ink-900/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-forensic text-paper-50 shadow-stamp">
            <Stamp className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-[15px] font-900 leading-tight text-ink-900">
              作文批改
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-forensic">
              人工改判 · 取证工作台
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`group flex items-start gap-3 rounded-md px-3 py-2.5 transition ${
                  active
                    ? 'bg-ink-900/[0.04] shadow-inset'
                    : 'hover:bg-ink-900/[0.03]'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    active ? 'text-forensic' : 'text-ink-400 group-hover:text-ink-700'
                  }`}
                />
                <div className="min-w-0">
                  <div
                    className={`text-[13px] font-600 ${
                      active ? 'text-ink-900' : 'text-ink-700'
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="truncate text-[10px] text-ink-400">{item.sub}</div>
                </div>
                {active && (
                  <span className="ml-auto mt-1 h-1.5 w-1.5 rounded-full bg-forensic" />
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-ink-900/10 px-4 py-4">
          <MiniStat label="标签冲突隔离" value={conflictCount} tone="text-forensic" />
          <MiniStat label="待补证据" value={needsCount} tone="text-amber-dark" />
          <div className="pt-1 text-[10px] text-ink-400">
            运营 · 老唐 / 负责人 · 周
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-ink-900/10 bg-paper-50 px-3 py-1.5">
      <span className="text-[10px] text-ink-400">{label}</span>
      <span className={`font-mono text-sm font-700 ${tone}`}>{value}</span>
    </div>
  )
}
