import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import StatusBadge from '@/components/StatusBadge'
import NotesPage from './NotesPage'
import {
  FileEdit,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NotesIndexPage() {
  const { id } = useParams()
  const { conflicts, fetchConflicts, summary, fetchSummary } = useAppStore()

  useEffect(() => {
    void fetchConflicts()
    void fetchSummary()
  }, [fetchConflicts, fetchSummary])

  const counts = useMemo(() => {
    return {
      auth_expired: conflicts.filter((c) => c.status === 'auth_expired').length,
      name_mismatch: conflicts.filter((c) => c.status === 'name_mismatch').length,
      normal: conflicts.filter((c) => c.status === 'normal').length,
    }
  }, [conflicts])

  if (id) {
    return <NotesPage conflictId={id} />
  }

  const activeId = conflicts[0]?.id
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 h-[calc(100vh-3rem)]">
      <aside className="glass-card rounded-2xl p-4 overflow-y-auto animate-fade-in-up">
        <div className="mb-4">
          <h2 className="font-display text-2xl text-white flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-violet-400" />
            冲突列表
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">
            选择一条记录编辑备注、授权标记
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatTile
            icon={CheckCircle2}
            value={counts.normal}
            label="正常"
            color="emerald"
          />
          <StatTile
            icon={ShieldAlert}
            value={counts.auth_expired}
            label="授权到期"
            color="violet"
          />
          <StatTile
            icon={AlertTriangle}
            value={counts.name_mismatch}
            label="名称不一致"
            color="amber"
          />
        </div>

        <div className="space-y-2">
          {conflicts.map((c, i) => (
            <Link
              to={`/notes/${c.id}`}
              key={c.id}
              className={cn(
                'block p-3 rounded-xl border transition-all animate-fade-in-up',
                `stagger-${Math.min(6, i + 1)}`,
                c.id === activeId
                  ? c.status === 'auth_expired'
                    ? 'bg-violet-500/10 border-violet-400/40'
                    : c.status === 'name_mismatch'
                      ? 'bg-amber-500/10 border-amber-400/40'
                      : 'bg-emerald-500/10 border-emerald-400/30'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-medium text-white text-sm line-clamp-2">{c.title}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={c.status} />
                <span className="text-[10px] text-slate-500 truncate">
                  {c.note ? c.note.slice(0, 12) + '...' : '无备注'}
                </span>
              </div>
            </Link>
          ))}
          {summary && summary.total > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-amber-500/5 border border-violet-400/15 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                演示数据包含
                <span className="text-amber-300 font-medium">名称不一致</span>和
                <span className="text-violet-300 font-medium">授权到期</span>
                记录，故意"不太干净"，方便你验证。
              </p>
            </div>
          )}
        </div>
      </aside>

      <div className="xl:col-span-3 overflow-y-auto pr-1">
        {activeId ? (
          <NotesPage conflictId={activeId} />
        ) : (
          <div className="glass-card rounded-2xl p-16 text-center text-slate-400 animate-fade-in-up">
            暂无冲突记录
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof CheckCircle2
  value: number
  label: string
  color: 'emerald' | 'violet' | 'amber'
}) {
  const style = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20',
    violet: 'text-violet-300 bg-violet-500/10 border-violet-400/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-400/20',
  }[color]
  return (
    <div className={`rounded-xl p-2.5 border ${style}`}>
      <Icon className="w-3.5 h-3.5 mb-1" />
      <p className="font-display text-xl leading-none">{value}</p>
      <p className="text-[9px] mt-1 opacity-70">{label}</p>
    </div>
  )
}
