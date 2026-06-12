import { useReplayStore } from '@/store/useReplayStore'
import PageHeader from '@/components/PageHeader'
import { CheckCircle2, CircleDashed, Paperclip, ToggleLeft } from 'lucide-react'

export default function TeacherView() {
  const { anomalies, evidences, steps, toggleEvidence } = useReplayStore()

  const resolved = anomalies.filter((a) => a.status === 'resolved')
  const pending = anomalies.filter((a) => a.status !== 'resolved')

  const missingEvidences = evidences.filter((e) => !e.provided)
  const providedEvidences = evidences.filter((e) => e.provided)

  return (
    <div>
      <PageHeader
        title="老师视图 · 处理状态追踪"
        subtitle="查看已处理项与待补证据清单，掌握整体进度"
      />
      <div className="p-6 grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-industrial-green font-semibold">
              <CheckCircle2 size={20} /> 已处理
            </div>
            <span className="text-xs text-industrial-muted">
              {resolved.length} / {anomalies.length}
            </span>
          </div>
          <div className="space-y-3">
            {resolved.map((a) => (
              <StatusCard
                key={a.id}
                anomaly={a}
                stepTitle={steps.find((s) => s.id === a.stepId)?.title}
              />
            ))}
            {resolved.length === 0 && (
              <EmptyTip text="暂无已处理项" />
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-industrial-orange font-semibold">
              <CircleDashed size={20} /> 待补证据
            </div>
            <span className="text-xs text-industrial-muted">
              还缺 {missingEvidences.length} 项
            </span>
          </div>
          <div className="space-y-3">
            {evidences.map((e) => {
              const anomaly = anomalies.find((a) => a.id === e.anomalyId)
              return (
                <div
                  key={e.id}
                  className={[
                    'rounded-lg border p-3 flex items-start gap-3',
                    e.provided
                      ? 'border-industrial-green/40 bg-industrial-green/5'
                      : 'border-industrial-orange/40 bg-industrial-orange/5',
                  ].join(' ')}
                >
                  <Paperclip
                    size={18}
                    className={e.provided ? 'text-industrial-green mt-0.5' : 'text-industrial-orange mt-0.5'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{e.name}</div>
                    <div className="text-xs text-industrial-muted mt-0.5">
                      关联异常：{anomaly?.description}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEvidence(e.id)}
                    className="shrink-0 text-xs px-2.5 py-1 rounded border flex items-center gap-1"
                  >
                    <ToggleLeft size={14} />
                    {e.provided ? '已提供' : '标为已补'}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="text-xs text-industrial-muted rounded border border-dashed border-industrial-border p-3">
            <div className="font-semibold text-industrial-text mb-1">统计</div>
            已提供证据：{providedEvidences.length}，待补证据：{missingEvidences.length}。
            {missingEvidences.length === 0 ? ' ✅ 证据齐全，可进入复核。' : ' ⚠️ 补齐后再交复核人员。'}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatusCard({
  anomaly,
  stepTitle,
}: {
  anomaly: (typeof anomalies)[number]
  stepTitle?: string
}) {
  return (
    <div className="rounded-lg border border-industrial-green/40 bg-industrial-green/5 p-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={16} className="text-industrial-green" />
        <span className="text-sm text-white font-medium">
          {anomaly.type === 'unit'
            ? '单位混写'
            : anomaly.type === 'direction'
              ? '方向反写'
              : '异常'}
        </span>
        <span className="ml-auto text-xs text-industrial-green bg-industrial-green/15 px-2 py-0.5 rounded">
          已处理
        </span>
      </div>
      <div className="mt-1 text-sm text-white">{anomaly.description}</div>
      {stepTitle && (
        <div className="mt-1 text-xs text-industrial-muted">步骤：{stepTitle}</div>
      )}
    </div>
  )
}

function EmptyTip({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-industrial-border p-6 text-center text-industrial-muted text-sm">
      {text}
    </div>
  )
}
