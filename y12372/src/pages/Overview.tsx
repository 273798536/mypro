import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, AlertTriangle, TrendingUp, Smartphone, Mic, Radio } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof DollarSign; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={cn('rounded-lg p-3')} style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="mt-1 font-serif-sc text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {sub && <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
    </div>
  )
}

const platformIcons: Record<string, typeof Smartphone> = { '短视频': Smartphone, 'KTV': Mic, '直播': Radio }
const platformColors: Record<string, string> = { '短视频': '#3b82f6', 'KTV': '#8b5cf6', '直播': '#f97316' }

export default function Overview() {
  const { overview, overviewLoading, overviewError, fetchOverview } = useStore()
  const navigate = useNavigate()

  useEffect(() => { fetchOverview() }, [fetchOverview])

  if (overviewLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="card h-28"><div className="skeleton h-full w-full" /></div>)}
        </div>
        <div className="grid grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="card h-36"><div className="skeleton h-full w-full" /></div>)}
        </div>
      </div>
    )
  }

  if (overviewError) {
    return (
      <div className="card flex items-center justify-center py-12">
        <p style={{ color: 'var(--coral)' }}>加载失败：{overviewError}</p>
      </div>
    )
  }

  if (!overview) return null

  const change = overview.periodComparison?.change ?? 0
  const comparisonText = change >= 0
    ? `较上期 +${change}%`
    : `较上期 ${change}%`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-5">
        <StatCard
          icon={DollarSign}
          label="版税总额"
          value={`¥${overview.totalRoyalty.toLocaleString()}`}
          color="var(--amber-gold)"
        />
        <StatCard
          icon={AlertTriangle}
          label="异常数量"
          value={String(overview.anomalyCount)}
          color="var(--coral)"
        />
        <StatCard
          icon={TrendingUp}
          label="周期对比"
          value={`¥${(overview.periodComparison?.current ?? 0).toLocaleString()}`}
          sub={comparisonText}
          color="var(--emerald)"
        />
      </div>

      <div>
        <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>平台分布</h3>
        <div className="grid grid-cols-3 gap-5">
          {overview.platformBreakdown?.map((p) => {
            const Icon = platformIcons[p.platform] || Smartphone
            const color = platformColors[p.platform] || '#6b7280'
            return (
              <div key={p.platform} className="card">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2" style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={18} />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p.platform}</span>
                </div>
                <p className="mt-3 font-serif-sc text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  ¥{p.amount.toLocaleString()}
                </p>
                <p className="mt-1 text-xs" style={{ color: p.change >= 0 ? '#34d399' : '#f87171' }}>
                  {p.change >= 0 ? '+' : ''}{p.change}%
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>异常概览</h3>
        <div className="card">
          <div className="mb-4 flex flex-wrap gap-3">
            {overview.anomalySummary?.map((a) => (
              <span key={a.type} className={cn(a.type.includes('漏报') ? 'badge-red' : a.type.includes('重复') ? 'badge-yellow' : 'badge-orange')}>
                {a.type} ({a.count})
              </span>
            ))}
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                <th className="pb-3 font-medium">作品名称</th>
                <th className="pb-3 font-medium">异常类型</th>
                <th className="pb-3 font-medium">日期</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentAnomalies?.map((a) => (
                <tr
                  key={a.id}
                  className="table-row cursor-pointer"
                  onClick={() => navigate(`/works/${a.id}`)}
                >
                  <td className="py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{a.workTitle}</td>
                  <td className="py-3">
                    <span className={cn(a.type.includes('漏报') ? 'badge-red' : 'badge-yellow')}>{a.type}</span>
                  </td>
                  <td className="py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
