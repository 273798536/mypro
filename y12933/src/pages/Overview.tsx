import { Link } from 'react-router-dom'
import { LayoutDashboard, Repeat2, ArrowUpRight, Database, Sparkles } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { api } from '@/api/client'
import { PageHeader } from '@/components/PageHeader'
import { SummaryBar } from '@/components/SummaryBar'
import { useUiStore } from '@/store/useUi'

export default function Overview() {
  const summary = useFetch(() => api.summary(), [])
  const versions = useFetch(() => api.versions(), [])
  const toast = useUiStore((s) => s.toast)
  const latest = versions.data?.[0]

  const refresh = () => {
    summary.refresh()
    versions.refresh()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <PageHeader
        title="概览"
        subtitle="奖励模型偏差复核 · 复核摘要与最近版本"
        icon={LayoutDashboard}
        actions={
          <button className="btn-ghost text-xs" onClick={refresh}>
            <Sparkles className="h-3.5 w-3.5" />
            刷新
          </button>
        }
      />

      {summary.error ? (
        <ErrorPanel message={summary.error} />
      ) : summary.data ? (
        <SummaryBar summary={summary.data} filters={{}} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-signal" />
              <h3 className="font-display text-base font-semibold text-zinc-100">最近版本</h3>
            </div>
            <Link to="/versions" className="btn-ghost px-2.5 py-1.5 text-xs">
              版本追踪
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {latest ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg font-semibold text-zinc-100">{latest.version}</span>
                {latest.label && (
                  <span className="chip border-white/10 bg-white/5 text-zinc-400">{latest.label}</span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(latest.created_at).toLocaleString('zh-CN')} · 记录 {latest.record_count} 条
              </div>
              {latest.summary && (
                <div className="grid grid-cols-4 gap-2">
                  <MiniStat label="通过" value={latest.summary.pass} color="text-pass" />
                  <MiniStat label="待确认" value={latest.summary.pending_confirm} color="text-warn" />
                  <MiniStat label="驳回" value={latest.summary.rejected} color="text-reject" />
                  <MiniStat label="待复核" value={latest.summary.pending} color="text-zinc-300" />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 text-sm text-zinc-500">尚未导入任何版本。</div>
          )}
        </div>

        <div className="panel flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-signal" />
              <h3 className="font-display text-base font-semibold text-zinc-100">日常入口</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              「评测回放」是日常整理标注、逐条复核分歧的入口。月底或课前再到「版本追踪」回看版本能否解释偏差。
            </p>
          </div>
          <Link to="/replay" className="btn-primary mt-4 w-full">
            <Repeat2 className="h-4 w-4" />
            进入评测回放
          </Link>
        </div>
      </div>

      <p className="text-center text-[11px] text-zinc-600">
        界面摘要与导出 CSV 共用同一后端查询，不会出现「页面通过 / 文件待确认」。
      </p>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-center">
      <div className={`font-mono text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="panel border-reject/30 p-5 text-sm text-reject">
      加载失败：{message}。请确认后端服务已启动（端口 3001）。
    </div>
  )
}
