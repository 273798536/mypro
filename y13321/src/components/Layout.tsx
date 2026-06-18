import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AlertTriangle, FileText, GitCompareArrows, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { detectDrift } from '@/utils/drift'
import { Badge } from './Badge'

const NAV = [
  { to: '/', label: '对比工作台', icon: GitCompareArrows, end: true },
  { to: '/drift', label: '阈值漂移监控', icon: AlertTriangle },
  { to: '/report', label: '截图说明导出', icon: FileText },
]

export default function Layout({ children }: { children: ReactNode }) {
  const samples = useStore((s) => s.samples)
  const confirmedDrifts = useStore((s) => s.confirmedDrifts)
  const finalized = useStore((s) => s.finalized)
  const location = useLocation()

  const unconfirmedDrift = samples.filter(
    (s) => detectDrift(s).detected && !confirmedDrifts.includes(s.sampleId),
  ).length

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-900/10 bg-paper-50/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-8 px-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rotate-45 border border-ink-900" />
              <span className="absolute inset-[5px] rotate-45 bg-change" />
            </span>
            <div className="leading-none">
              <div className="font-serif text-[15px] font-semibold tracking-tight">作文批改灰度对比</div>
              <div className="num text-[10px] uppercase tracking-[0.18em] text-ink-500">
                Essay Grading · Gray A/B
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-ink-900/8 text-ink-900'
                        : 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-800',
                    ].join(' ')
                  }
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {unconfirmedDrift > 0 ? (
              <Badge tone="drift">
                <AlertTriangle className="h-3 w-3" />
                漂移待确认 {unconfirmedDrift}
              </Badge>
            ) : (
              <Badge tone="consistent">
                <ShieldCheck className="h-3 w-3" />
                漂移已清零
              </Badge>
            )}
            <Badge tone={finalized ? 'ink' : 'neutral'}>
              算完：{finalized ? '已标记' : '未标记'}
            </Badge>
          </div>
        </div>
        {location.pathname.startsWith('/drift') && unconfirmedDrift > 0 && (
          <div className="h-[2px] w-full bg-drift/60" />
        )}
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  )
}
