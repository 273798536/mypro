import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import StatusBadge from '@/components/StatusBadge'
import {
  FileDown,
  ShieldAlert,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  Layers,
} from 'lucide-react'
import { formatDateTime } from '@/utils/format'
import { STATUS_LABEL, ROLE_LABEL } from '@/types'
import { cn } from '@/lib/utils'

export default function ExportPage() {
  const { conflicts, summary, fetchConflicts, fetchSummary } = useAppStore()
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void fetchConflicts()
    void fetchSummary()
  }, [fetchConflicts, fetchSummary])

  const { authExpiredList, normalList, mismatchList } = useMemo(() => {
    const authExpiredList = conflicts.filter((c) => c.status === 'auth_expired')
    const mismatchList = conflicts.filter((c) => c.status === 'name_mismatch')
    const normalList = conflicts.filter(
      (c) => c.status !== 'auth_expired' && c.status !== 'name_mismatch',
    )
    return { authExpiredList, normalList, mismatchList }
  }, [conflicts])

  const handleExport = async () => {
    try {
      setExporting(true)
      const res = await fetch('/api/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `巡演耳返排期冲突清单_${formatDateForFile(new Date())}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setTimeout(() => setExporting(false), 500)
    }
  }

  return (
    <div className="space-y-6">
      <header className="animate-fade-in-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-white flex items-center gap-2">
            <FileDown className="w-7 h-7 text-amber-400" />
            导出清单
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            导出内容与当前页面完全一致；
            <span className="text-violet-300">授权到期记录</span>单独分区拎出，
            不会被揉进正常结果。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void fetchConflicts()
              void fetchSummary()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-300 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新对齐
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || conflicts.length === 0}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all',
              conflicts.length > 0 && !exporting
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                : 'bg-white/5 text-slate-500 cursor-not-allowed',
            )}
          >
            <Download className={cn('w-4 h-4', exporting && 'animate-spin')} />
            {exporting ? '导出中...' : '导出 CSV 清单'}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={FileText}
          label="总计导出"
          value={summary?.total ?? conflicts.length}
          color="text-white"
          gradient="from-violet-500/20 to-rose-500/10"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="正常记录"
          value={summary?.normal ?? normalList.length}
          color="text-emerald-200"
          gradient="from-emerald-500/20 to-teal-500/10"
        />
        <SummaryCard
          icon={ShieldAlert}
          label="授权到期（单独）"
          value={summary?.auth_expired ?? authExpiredList.length}
          color="text-violet-200"
          gradient="from-violet-500/25 to-fuchsia-500/10"
          highlight
        />
        <SummaryCard
          icon={AlertTriangle}
          label="名称不一致"
          value={summary?.name_mismatch ?? mismatchList.length}
          color="text-amber-200"
          gradient="from-amber-500/20 to-orange-500/10"
        />
      </section>

      <section className="glass-card rounded-2xl overflow-hidden animate-fade-in-up stagger-1">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display text-lg text-white">正常记录 · 共 {normalList.length} 条</h3>
          </div>
          <span className="text-[11px] text-slate-500">
            这些会出现在 CSV 的主要区域
          </span>
        </div>
        <ConflictTable rows={normalList} />
      </section>

      <section className="glass-card rounded-2xl overflow-hidden animate-fade-in-up stagger-2 border-violet-400/30">
        <div className="flex items-start justify-between px-5 py-4 border-b border-violet-400/15 bg-gradient-to-r from-violet-500/15 to-transparent">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-violet-300" />
              <h3 className="font-display text-lg text-white">
                授权到期记录 · 单独拎出
              </h3>
            </div>
            <p className="text-[11px] text-violet-300/80 mt-1">
              CSV 在正常记录之后单独分区，防止被当作正常结果处理
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200">
            共 {authExpiredList.length} 条
          </span>
        </div>
        <ConflictTable rows={authExpiredList} highlightAuth />
        {authExpiredList.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-sm">
            当前没有授权到期记录
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl overflow-hidden animate-fade-in-up stagger-3 border-amber-400/30">
        <div className="flex items-start justify-between px-5 py-4 border-b border-amber-400/15 bg-gradient-to-r from-amber-500/10 to-transparent">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h3 className="font-display text-lg text-white">
                名称不一致（"不太干净"的演示数据）
              </h3>
            </div>
            <p className="text-[11px] text-amber-300/80 mt-1">
              故意保留的脏数据样例，验证系统对异常名称的识别能力
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200">
            共 {mismatchList.length} 条
          </span>
        </div>
        <ConflictTable rows={mismatchList} highlightMismatch />
      </section>

      <section className="glass-card rounded-2xl p-5 animate-fade-in-up stagger-4">
        <h3 className="font-display text-lg text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          对齐自检
        </h3>
        <ul className="space-y-2.5 text-sm">
          <AlignCheck
            ok={
              (summary?.auth_expired ?? authExpiredList.length) ===
              authExpiredList.length
            }
            label="摘要中授权到期数 = 单独分区数"
            hint={`摘要:${summary?.auth_expired ?? authExpiredList.length} / 分区:${authExpiredList.length}`}
          />
          <AlignCheck
            ok={conflicts.length === (summary?.total ?? conflicts.length)}
            label="摘要总数 = 记录总数"
            hint={`摘要:${summary?.total ?? conflicts.length} / 实际:${conflicts.length}`}
          />
          <AlignCheck
            ok={
              conflicts.filter((c) => !!c.auth_expired).length ===
              conflicts.filter((c) => c.status === 'auth_expired').length
            }
            label="授权标记字段 与 状态字段 对齐"
            hint={`标记数:${conflicts.filter((c) => !!c.auth_expired).length} / 状态数:${conflicts.filter((c) => c.status === 'auth_expired').length}`}
          />
          <AlignCheck
            ok={conflicts.every((c) => STATUS_LABEL[c.status])}
            label="所有记录状态合法"
            hint={conflicts
              .filter((c) => !STATUS_LABEL[c.status])
              .map((c) => c.title)
              .join('、') || '全部合法'}
          />
          <AlignCheck
            ok={
              conflicts.every((c) => {
                if (c.auth_note && !c.auth_expired) return false
                return true
              })
            }
            label="授权备注仅在授权到期时填写"
            hint="避免备注被错误归因到正常记录"
          />
          <AlignCheck
            ok={Object.values(ROLE_LABEL).length === 3}
            label="角色字典健全"
            hint={Object.values(ROLE_LABEL).join('、')}
          />
        </ul>
      </section>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  gradient,
  highlight,
}: {
  icon: typeof FileText
  label: string
  value: number
  color: string
  gradient: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 bg-gradient-to-br animate-count-in',
        gradient,
        highlight && 'border-violet-400/40 shadow-lg shadow-violet-500/10',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/60 mb-1">{label}</p>
          <p className={cn('font-display text-4xl', color)}>{value}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-white/80" />
        </div>
      </div>
    </div>
  )
}

function ConflictTable({
  rows,
  highlightAuth,
  highlightMismatch,
}: {
  rows: ReturnType<typeof useAppStore.getState>['conflicts']
  highlightAuth?: boolean
  highlightMismatch?: boolean
}) {
  if (rows.length === 0 && !highlightAuth) {
    return (
      <div className="py-10 text-center text-slate-500 text-sm">暂无记录</div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
            <th className="text-left font-medium px-5 py-3">标题</th>
            <th className="text-left font-medium px-3 py-3">状态</th>
            <th className="text-left font-medium px-3 py-3">备注</th>
            <th className="text-left font-medium px-3 py-3">授权备注</th>
            <th className="text-left font-medium px-5 py-3">更新时间</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id}
              className={cn(
                'border-t border-white/5 transition-colors hover:bg-white/[0.02]',
                highlightAuth && 'bg-violet-500/[0.03]',
                highlightMismatch && 'bg-amber-500/[0.03]',
              )}
            >
              <td className="px-5 py-3 align-top text-white font-medium whitespace-nowrap">
                {r.title}
              </td>
              <td className="px-3 py-3 align-top">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-3 align-top max-w-[320px] text-slate-300">
                {r.note || (
                  <span className="text-slate-600 italic">空</span>
                )}
              </td>
              <td className="px-3 py-3 align-top max-w-[240px]">
                {r.auth_note ? (
                  <span className="inline-block p-2 rounded-lg bg-violet-500/10 border border-violet-400/20 text-violet-200 text-xs">
                    {r.auth_note}
                  </span>
                ) : (
                  <span className="text-slate-600 text-xs">—</span>
                )}
                {i === 0 && highlightMismatch && (
                  <div className="mt-2 text-[11px] text-amber-300 border border-amber-400/30 rounded-lg p-2 bg-amber-500/5">
                    ⚠️ 此条故意保留演示：曲目"夜曲" vs "夜的小夜曲" 名称不一致
                  </div>
                )}
              </td>
              <td className="px-5 py-3 align-top text-slate-500 text-xs whitespace-nowrap">
                {formatDateTime(r.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlignCheck({
  ok,
  label,
  hint,
}: {
  ok: boolean
  label: string
  hint: string
}) {
  return (
    <li
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border',
        ok
          ? 'bg-emerald-500/[0.04] border-emerald-400/15'
          : 'bg-rose-500/[0.05] border-rose-400/20',
      )}
    >
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium text-sm',
            ok ? 'text-emerald-200' : 'text-rose-200',
          )}
        >
          {label}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
      </div>
      <span
        className={cn(
          'text-[10px] px-2 py-0.5 rounded-full shrink-0',
          ok
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
            : 'bg-rose-500/15 text-rose-300 border border-rose-400/20',
        )}
      >
        {ok ? '对齐' : '不对齐'}
      </span>
    </li>
  )
}

function formatDateForFile(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}
