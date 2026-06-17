import { Link } from 'react-router-dom'
import { AlertTriangle, Copy, ShieldOff, CheckCircle2, FileStack, Repeat } from 'lucide-react'
import { api } from '@/lib/api'
import { useFetch } from '@/hooks/useFetch'
import { Panel, SectionTitle, Skeleton, StatusBadge } from '@/components/ui'
import type { OverviewStats } from '../../shared/types'

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  delay,
}: {
  label: string
  value: number
  icon: typeof CheckCircle2
  tone: 'viridian' | 'saffron' | 'brick' | 'ink'
  delay: number
}) {
  const toneMap = {
    viridian: 'text-viridian border-viridian/30',
    saffron: 'text-saffron border-saffron/30',
    brick: 'text-brick border-brick/40',
    ink: 'text-paper border-ink-600',
  }
  return (
    <div
      className="panel panel-pad animate-risein"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${toneMap[tone].split(' ')[0]}`} />
      </div>
      <div className={`stat-num mt-3 text-5xl ${toneMap[tone].split(' ')[0]}`}>{value}</div>
      <div className={`mt-3 h-0.5 w-full rounded ${toneMap[tone].split(' ')[1]} bg-current opacity-30`} />
    </div>
  )
}

export default function Overview() {
  const { data, loading, error } = useFetch<OverviewStats>(() => api.overview())

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="DAILY ENTRY · 日常入口"
        title="分布统计"
        desc="安全审核员每日从这里进入。先看坏记录能不能被拎出来，再看去重是否可解释。月底或课前重点核对去重条数与来源。"
      />

      {error && (
        <Panel className="border-brick/50">
          <div className="flex items-center gap-2 text-sm text-brick">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        </Panel>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="总切片" value={data.total} icon={FileStack} tone="ink" delay={0} />
            <StatCard label="通过" value={data.pass} icon={CheckCircle2} tone="viridian" delay={80} />
            <StatCard label="待确认" value={data.pending} icon={AlertTriangle} tone="saffron" delay={160} />
            <StatCard label="坏记录" value={data.bad} icon={ShieldOff} tone="brick" delay={240} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2 animate-risein" >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-paper">坏记录分类</h3>
                <Link
                  to="/quality?filter=bad"
                  className="font-mono text-[11px] text-saffron hover:text-saffron-glow"
                >
                  前往拎取 →
                </Link>
              </div>
              <BadCategory
                icon={Copy}
                label="脏样本重复"
                value={data.badTypeCounts.dirty_dup}
                total={data.bad}
                tone="saffron"
              />
              <BadCategory
                icon={ShieldOff}
                label="安全规则漏配"
                value={data.badTypeCounts.secure_misconfig}
                total={data.bad}
                tone="brick"
              />
              <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-950/50 p-3 font-mono text-xs text-ink-400">
                <span className="text-ink-300">说明：</span>
                坏记录优先拎取。安全审核员会用"安全规则漏配"记录做溯源验收倒查。
              </div>
            </Panel>

            <Panel className="animate-risein" >
              <div className="mb-3 flex items-center gap-2">
                <Repeat className="h-4 w-4 text-saffron" />
                <h3 className="font-display text-lg font-semibold text-paper">去重可解释性</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="stat-num text-4xl text-saffron">{data.dedup.dedupCount}</span>
                <span className="text-sm text-ink-400">条已归并</span>
              </div>
              <div className="mt-2">
                <StatusBadge status={data.dedup.explainable ? 'pass' : 'pending'} />
                <span className="ml-2 text-xs text-ink-400">
                  {data.dedup.explainable ? '来源可解释' : '尚无重复'}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{data.dedup.detail}</p>
              {data.dedup.pairs.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {data.dedup.pairs.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-ink-700/60 bg-ink-900/60 px-3 py-1.5 font-mono text-xs"
                    >
                      <span className="text-brick">{p.from}</span>
                      <span className="text-ink-400">→ 归并至 →</span>
                      <span className="text-saffron">{p.to}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}

function BadCategory({
  icon: Icon,
  label,
  value,
  total,
  tone,
}: {
  icon: typeof Copy
  label: string
  value: number
  total: number
  tone: 'saffron' | 'brick'
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const barColor = tone === 'saffron' ? 'bg-saffron' : 'bg-brick'
  const textColor = tone === 'saffron' ? 'text-saffron' : 'text-brick'
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-paper">
          <Icon className={`h-4 w-4 ${textColor}`} />
          {label}
        </div>
        <div className="font-mono text-sm">
          <span className={textColor}>{value}</span>
          <span className="text-ink-400"> / {total} · {pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
