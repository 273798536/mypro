import { useStore } from '@/store/useStore'
import { X, ClipboardList, FileText, CheckCircle, AlertTriangle, Edit3, Clock } from 'lucide-react'
import { useState } from 'react'

export default function DeliverySummary() {
  const deliverySummaryOpen = useStore((s) => s.deliverySummaryOpen)
  const setDeliverySummaryOpen = useStore((s) => s.setDeliverySummaryOpen)
  const generateDeliverySummary = useStore((s) => s.generateDeliverySummary)
  const entries = useStore((s) => s.entries)
  const screenshots = useStore((s) => s.screenshots)
  const overrides = useStore((s) => s.overrides)
  const versions = useStore((s) => s.versions)

  const [copied, setCopied] = useState(false)

  if (!deliverySummaryOpen) return null

  const summary = generateDeliverySummary()
  const aligned = entries.filter((e) => e.status === 'aligned').length
  const conflict = entries.filter((e) => e.status === 'conflict').length
  const overridden = entries.filter((e) => e.status === 'overridden').length
  const missing = entries.filter((e) => e.status === 'missing_period').length

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-inkstone/30 backdrop-blur-sm" onClick={() => setDeliverySummaryOpen(false)} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        <div className="px-5 py-4 border-b border-sandstone/60 flex items-center justify-between shrink-0">
          <h3 className="font-serif text-base font-semibold text-inkstone flex items-center gap-2">
            <ClipboardList size={16} />
            交付摘要
          </h3>
          <button
            onClick={() => setDeliverySummaryOpen(false)}
            className="p-1 hover:bg-sandstone/40 rounded transition-colors"
          >
            <X size={18} className="text-driftwood" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h4 className="text-xs font-medium text-driftwood uppercase tracking-wider mb-2">对齐状态</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-sage/10 rounded-lg p-3 text-center">
                <CheckCircle size={18} className="text-sage mx-auto mb-1" />
                <p className="text-lg font-semibold text-moss">{aligned}</p>
                <p className="text-xs text-driftwood">已对齐</p>
              </div>
              <div className="bg-ochre/10 rounded-lg p-3 text-center">
                <AlertTriangle size={18} className="text-ochre mx-auto mb-1" />
                <p className="text-lg font-semibold text-ochre">{conflict}</p>
                <p className="text-xs text-driftwood">冲突</p>
              </div>
              <div className="bg-amber/10 rounded-lg p-3 text-center">
                <Edit3 size={18} className="text-amber mx-auto mb-1" />
                <p className="text-lg font-semibold text-amber">{overridden}</p>
                <p className="text-xs text-driftwood">已改判</p>
              </div>
              <div className="bg-sandstone/50 rounded-lg p-3 text-center">
                <Clock size={18} className="text-driftwood mx-auto mb-1" />
                <p className="text-lg font-semibold text-driftwood">{missing}</p>
                <p className="text-xs text-driftwood">缺期限</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-driftwood uppercase tracking-wider mb-2">排练群截图 ({screenshots.length})</h4>
            <div className="space-y-1.5">
              {screenshots.map((ss) => (
                <div key={ss.id} className="text-xs bg-parchment/60 rounded px-2.5 py-1.5 flex justify-between">
                  <span className="text-inkstone">{ss.sourceGroup} · {ss.speaker}</span>
                  <span className="text-driftwood">{new Date(ss.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              ))}
            </div>
          </div>

          {overrides.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-driftwood uppercase tracking-wider mb-2">处理记录 ({overrides.length})</h4>
              <div className="space-y-1.5">
                {overrides.map((ovr) => (
                  <div key={ovr.id} className="text-xs bg-amber/5 border border-amber/15 rounded px-2.5 py-1.5">
                    <span className="text-amber font-medium">{ovr.operator}</span>
                    <span className="text-driftwood">：{ovr.oldValue}→{ovr.newValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium text-driftwood uppercase tracking-wider mb-2">版本 ({versions.length})</h4>
            <div className="space-y-1.5">
              {versions.map((v) => (
                <div key={v.id} className="text-xs bg-parchment/60 rounded px-2.5 py-1.5 flex justify-between">
                  <span className="text-inkstone">{v.label}</span>
                  <span className="text-driftwood">{new Date(v.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-driftwood uppercase tracking-wider mb-2">完整摘要文本</h4>
            <div className="bg-parchment/80 border border-sandstone/40 rounded-lg p-3">
              <pre className="text-xs text-inkstone/80 whitespace-pre-wrap font-sans leading-relaxed">
                {summary}
              </pre>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-sandstone/60 flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className={`flex-1 py-2 text-sm rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
              copied
                ? 'bg-sage text-white'
                : 'bg-inkstone text-parchment hover:bg-moss'
            }`}
          >
            <FileText size={14} />
            {copied ? '已复制' : '复制摘要'}
          </button>
        </div>
      </div>
    </div>
  )
}
