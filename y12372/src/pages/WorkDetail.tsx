import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, MessageSquareWarning } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import RoyaltyChain from '@/components/RoyaltyChain'
import ProportionTimeline from '@/components/ProportionTimeline'

const platformLabel: Record<string, string> = { short_video: '短视频', ktv: 'KTV', live: '直播' }
const platformBadge: Record<string, string> = { short_video: 'badge-blue', ktv: 'badge-purple', live: 'badge-orange' }
const correctionTypeLabel: Record<string, string> = { under_report: '漏报', proportion_change: '比例变更', duplicate_use: '重复使用' }

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentWork, workLoading, workError, fetchWorkDetail } = useStore()

  useEffect(() => {
    if (id) fetchWorkDetail(id)
  }, [id, fetchWorkDetail])

  if (workLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 w-full" />)}</div>
  }

  if (workError) {
    return (
      <div className="card flex items-center justify-center py-12">
        <p style={{ color: 'var(--coral)' }}>加载失败：{workError}</p>
      </div>
    )
  }

  if (!currentWork) return null

  const grouped = currentWork.usageRecords.reduce<Record<string, typeof currentWork.usageRecords>>((acc, r) => {
    ;(acc[r.platform] ?? (acc[r.platform] = [])).push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <button className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }} onClick={() => navigate('/works')}>
        <ArrowLeft size={16} /> 返回作品列表
      </button>

      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif-sc text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{currentWork.title}</h2>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>ISRC：{currentWork.isrc}</span>
              <span>词作者：{currentWork.lyricist}</span>
              <span>曲作者：{currentWork.composer}</span>
              {currentWork.registeredDate && <span>首次登记：{currentWork.registeredDate}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex items-center gap-1.5"><Plus size={14} /> 新增修正</button>
            <button className="btn-secondary flex items-center gap-1.5"><MessageSquareWarning size={14} /> 发起申诉</button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>使用记录</h3>
        {Object.entries(grouped).map(([platform, records]) => (
          <div key={platform} className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={cn(platformBadge[platform] || 'badge-blue')}>{platformLabel[platform] || platform}</span>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    <th className="px-4 py-2 font-medium">周期</th>
                    <th className="px-4 py-2 font-medium">使用次数</th>
                    <th className="px-4 py-2 font-medium">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{r.period}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{r.usageCount}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: 'var(--amber-gold)' }}>¥{r.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RoyaltyChain steps={currentWork.royaltyChain} />
        <ProportionTimeline versions={currentWork.proportionVersions} />
      </div>

      <div>
        <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>修正与申诉记录</h3>
        {currentWork.corrections.length === 0 && currentWork.appeals.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无修正与申诉记录</p>
        ) : (
          <div className="space-y-3">
            {currentWork.corrections.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-center gap-3 text-sm">
                  <span className="badge-yellow">{correctionTypeLabel[c.type] || c.type}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.operator} · {c.date}</span>
                </div>
                <div className="mt-2 flex gap-4 text-sm">
                  <div><span style={{ color: 'var(--text-muted)' }}>变更前：</span><span style={{ color: 'var(--coral)' }}>{c.before}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>变更后：</span><span style={{ color: 'var(--emerald)' }}>{c.after}</span></div>
                </div>
                <p className="mt-2 rounded px-2 py-1 text-xs" style={{ backgroundColor: 'rgba(212, 168, 83, 0.12)', color: 'var(--amber-gold-light)' }}>{c.explanation}</p>
              </div>
            ))}
            {currentWork.appeals.map((a) => (
              <div key={a.id} className="card">
                <div className="flex items-center gap-3 text-sm">
                  <span className={a.status === 'pending' ? 'badge-yellow' : a.status === 'platform_replied' ? 'badge-blue' : 'badge-green'}>
                    {{ pending: '待处理', platform_replied: '平台已回复', confirmed: '已确认' }[a.status]}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{a.date}</span>
                </div>
                {a.platformReply && <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>平台回复：{a.platformReply}</p>}
                {a.result && <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>结果：{a.result}</p>}
                <p className="mt-2 rounded px-2 py-1 text-xs" style={{ backgroundColor: 'rgba(212, 168, 83, 0.12)', color: 'var(--amber-gold-light)' }}>{a.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
