import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Search,
  FileEdit,
  Calendar,
} from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { formatDateTime } from '@/utils/format'
import type { ConflictStatus } from '@/types'

type Filter = 'all' | ConflictStatus

export default function Dashboard() {
  const { conflicts, summary, fetchConflicts, fetchSummary } = useAppStore()

  useEffect(() => {
    void fetchConflicts()
    void fetchSummary()
  }, [fetchConflicts, fetchSummary])

  const [filter, setFilter] = useState<Filter>(
    () => (localStorage.getItem('cf_filter') as Filter) || 'all',
  )
  const [q, setQ] = useState<string>(() => localStorage.getItem('cf_q') || '')

  useEffect(() => {
    localStorage.setItem('cf_filter', filter)
  }, [filter])
  useEffect(() => {
    localStorage.setItem('cf_q', q)
  }, [q])

  const filtered = useMemo(
    () =>
      conflicts.filter((c) => {
        if (filter !== 'all' && c.status !== filter) return false
        if (q && !c.title.includes(q) && !c.note.includes(q)) return false
        return true
      }),
    [conflicts, filter, q],
  )

  const counters = [
    {
      key: 'total' as const,
      label: '冲突总数',
      value: summary?.total ?? conflicts.length,
      icon: AlertTriangle,
      color: 'from-amber-500/20 to-rose-500/10 border-amber-400/20 text-amber-300',
      numColor: 'text-white',
    },
    {
      key: 'normal' as const,
      label: '正常处理',
      value: summary?.normal ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/20 text-emerald-300',
      numColor: 'text-emerald-200',
    },
    {
      key: 'auth_expired' as const,
      label: '授权到期',
      value: summary?.auth_expired ?? 0,
      icon: ShieldAlert,
      color: 'from-violet-500/20 to-fuchsia-500/10 border-violet-400/25 text-violet-300',
      numColor: 'text-violet-200',
    },
    {
      key: 'name_mismatch' as const,
      label: '名称不一致',
      value: summary?.name_mismatch ?? 0,
      icon: AlertTriangle,
      color: 'from-orange-500/20 to-amber-500/10 border-orange-400/25 text-orange-300',
      numColor: 'text-orange-200',
    },
  ]

  const filterTabs: { key: Filter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'normal', label: '正常' },
    { key: 'auth_expired', label: '授权到期' },
    { key: 'name_mismatch', label: '名称不一致' },
  ]

  return (
    <div className="space-y-6">
      <header className="animate-fade-in-up">
        <h2 className="font-display text-3xl text-white mb-1">巡演耳返 · 排期冲突总览</h2>
        <p className="text-slate-400 text-sm">
          所有备注即时同步后端与导出清单；授权到期记录单独拎出，不会揉进正常结果。
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {counters.map((c, i) => {
          const Icon = c.icon
          return (
            <div
              key={c.key}
              className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${c.color} animate-count-in stagger-${i + 1}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-white/60 mb-1">{c.label}</p>
                  <p className={`font-display text-4xl ${c.numColor}`}>{c.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-amber-500"
                  style={{
                    width: `${summary?.total ? Math.min(100, ((c.value / summary.total) * 100) | 0) : 0}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </section>

      <section className="glass-card rounded-2xl p-5 animate-fade-in-up stagger-2">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5 flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索标题或备注内容..."
              className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 flex-1"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/5">
            {filterTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  filter === t.key
                    ? 'bg-gradient-to-r from-violet-500/80 to-amber-500/70 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <Link
              to={`/notes/${c.id}`}
              key={c.id}
              className={`group glass-card rounded-xl p-5 block transition-all duration-250 hover:-translate-y-0.5 hover:shadow-2xl animate-fade-in-up stagger-${Math.min(6, (i % 6) + 1)} ${
                c.status === 'auth_expired'
                  ? 'border-violet-400/30 hover:border-violet-400/60'
                  : c.status === 'name_mismatch'
                    ? 'border-amber-400/30 hover:border-amber-400/60'
                    : 'hover:border-emerald-400/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-medium text-white leading-tight line-clamp-2">
                  {c.title}
                </h3>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-slate-400 line-clamp-2 min-h-[40px] mb-4">
                {c.note || '暂无备注'}
              </p>
              {c.auth_note && (
                <div className="mb-4 p-2.5 rounded-lg bg-violet-500/10 border border-violet-400/20 text-[12px] text-violet-200 flex items-start gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{c.auth_note}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {formatDateTime(c.updated_at)}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FileEdit className="w-3 h-3" />
                  查看/编辑
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 text-sm">
              没有匹配的冲突记录
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
