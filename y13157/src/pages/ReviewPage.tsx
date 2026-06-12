import { useReplayStore } from '@/store/useReplayStore'
import PageHeader from '@/components/PageHeader'
import AnomalyBanner from '@/components/AnomalyBanner'
import { FileText, AlertTriangle, MessageSquare } from 'lucide-react'

export default function ReviewPage() {
  const { paramVersions, steps, anomalies, paramValues } = useReplayStore()

  return (
    <div>
      <PageHeader
        title="复核一页通"
        subtitle="参数版本 · 异常点 · 解释说明 同屏呈现"
      />
      <div className="p-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-industrial-border bg-industrial-card p-4">
          <div className="flex items-center gap-2 text-industrial-blue font-semibold mb-3">
            <FileText size={18} /> 参数版本
          </div>
          <div className="space-y-3">
            {paramVersions.map((v) => (
              <div
                key={v.id}
                className="rounded border border-industrial-border bg-industrial-panel p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono font-semibold">{v.name}</span>
                  <span className="text-xs text-industrial-muted">{v.id}</span>
                </div>
                <div className="mt-2 text-xs text-industrial-muted space-y-0.5">
                  <div>操作人：{v.operator}</div>
                  <div>时间：{v.createdAt}</div>
                  <div>参数数：{paramValues.filter(p=>p.versionId===v.id).length}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-industrial-muted">
            步骤清单：
            <ul className="mt-1.5 space-y-1">
              {steps.map((s) => (
                <li
                  key={s.id}
                  className={[
                    'flex items-center gap-2',
                    s.isRetracted ? 'text-industrial-muted line-through opacity-60' : 'text-industrial-text',
                  ].join(' ')}
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-industrial-blue/20 text-industrial-blue text-[10px] font-bold">
                    {s.stepIndex}
                  </span>
                  <span className="truncate">{s.title}</span>
                  {s.isRetracted && (
                    <span className="text-industrial-red text-[10px] px-1.5 py-0.5 rounded border border-industrial-red/40">
                      撤回
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-lg border border-industrial-border bg-industrial-card p-4">
          <div className="flex items-center gap-2 text-industrial-orange font-semibold mb-3">
            <AlertTriangle size={18} /> 异常点
            <span className="ml-auto text-xs text-industrial-muted">
              {anomalies.filter(a=>a.status!=='resolved').length} 待处理
            </span>
          </div>
          <div className="space-y-3">
            {anomalies.map((a) => (
              <AnomalyBanner key={a.id} anomaly={a} compact />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-industrial-border bg-industrial-card p-4">
          <div className="flex items-center gap-2 text-industrial-green font-semibold mb-3">
            <MessageSquare size={18} /> 解释说明
          </div>
          <div className="space-y-3 text-sm">
            <NoteItem
              title="关于单位混写"
              body="步骤3流量原记 2.4 m³/h，实际现场照片显示为 2.4 L/min，导致步骤6制热量被放大 60 倍 (4320 → 72 kW)，COP 同步虚高至 12.6。修正后 COP 为 4.2，属于正常范围。"
            />
            <NoteItem
              title="关于方向符号反写"
              body="步骤5四通阀体箭头打印为 forward(→)，但听针判断制热模式下实际流向为 reverse(←)。方向反写会导致循环走向分析错误，进而影响膨胀阀开度判断。"
            />
            <NoteItem
              title="关于撤回记录"
              body="步骤3已标记为撤回（含斜纹底+红色印章），表示该条记录作废，不应纳入最终计算。演示包特意保留该撤回记录以贴近真实现场。"
            />
            <NoteItem
              title="结果变化关键路径"
              body="流量单位 → 制热量 Q → COP；方向符号 → 循环分析 → 膨胀阀开度。以上两步是两次版本回放差异的根本原因。"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function NoteItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-industrial-border bg-industrial-panel p-3">
      <div className="text-white font-semibold text-sm">{title}</div>
      <p className="mt-1 text-xs text-industrial-muted leading-relaxed">{body}</p>
    </div>
  )
}
