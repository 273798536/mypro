import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Activity, ClipboardCheck, Boxes, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '延迟看板', desc: '复制延迟与异常汇总', icon: Activity },
  { to: '/review', label: '复核中心', desc: '异常全链路追溯', icon: ClipboardCheck },
  { to: '/runs', label: '批处理与下载', desc: '共享记录与报告', icon: Boxes },
]

export function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation()
  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-950/60 backdrop-blur md:flex">
        <div className="flex items-center gap-3 border-b border-ink-800 px-5 py-5">
          <div className="relative grid h-9 w-9 place-items-center rounded-lg border border-signal-sky/40 bg-signal-sky/10">
            <Database className="h-4 w-4 text-signal-sky" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-signal-emerald" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink-300">读写分离</div>
            <div className="text-[11px] uppercase tracking-widest text-ink-500">延迟看板 · DELAY OPS</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((n) => {
            const active = loc.pathname === n.to
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className={cn(
                  'group flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  active
                    ? 'border-signal-sky/30 bg-signal-sky/10'
                    : 'border-transparent hover:border-ink-700 hover:bg-ink-850',
                )}
              >
                <n.icon className={cn('mt-0.5 h-4 w-4', active ? 'text-signal-sky' : 'text-ink-400 group-hover:text-ink-300')} />
                <div className="leading-tight">
                  <div className={cn('text-sm font-medium', active ? 'text-ink-300' : 'text-ink-300/90')}>{n.label}</div>
                  <div className="text-[11px] text-ink-500">{n.desc}</div>
                </div>
              </NavLink>
            )
          })}
        </nav>
        <div className="border-t border-ink-800 px-5 py-4">
          <div className="mono text-[10px] leading-relaxed text-ink-500">
            本地 SQLite · node:sqlite
            <br />
            schema 对比与索引建议共用同一批 run 记录
          </div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-800 bg-ink-950/40 px-6 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-300">
            <Database className="h-4 w-4 text-signal-sky" /> 读写分离延迟看板
          </div>
        </header>
        <div className="grid-texture flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
