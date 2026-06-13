import { ArrowDown, X } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'

const paramNameMap: Record<string, string> = {
  dropletDiameter: '水滴直径',
  flowRate: '流量',
  temperature: '温度',
  humidity: '湿度',
}

export default function ImpactChainModal() {
  const showImpactChain = useReplayStore((s) => s.showImpactChain)
  const selectedNoteId = useReplayStore((s) => s.selectedNoteId)
  const notes = useReplayStore((s) => s.notes)
  const setShowImpactChain = useReplayStore((s) => s.setShowImpactChain)

  if (!showImpactChain || !selectedNoteId) return null

  const note = notes.find((n) => n.id === selectedNoteId)
  if (!note) return null

  const steps = [
    {
      number: 1,
      label: '后补备注内容',
      content: note.content,
    },
    {
      number: 2,
      label: '影响参数',
      content:
        note.affectedParameters.length > 0
          ? note.affectedParameters
              .map((p) => `${paramNameMap[p] ?? p} ${p}`)
              .join('、')
          : '无',
    },
    {
      number: 3,
      label: '结论变化',
      content: note.conclusionChange || '无',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={() => setShowImpactChain(false)}
    >
      <div
        className="relative w-full max-w-lg rounded-lg border p-6 shadow-xl"
        style={{
          backgroundColor: '#0f172a',
          borderColor: 'rgba(245,158,11,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-white"
          onClick={() => setShowImpactChain(false)}
        >
          <X size={20} />
        </button>

        <h2
          className="mb-6 text-lg font-semibold"
          style={{ color: '#f59e0b' }}
        >
          影响链路
        </h2>

        <div className="flex flex-col items-center gap-0">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex w-full flex-col items-center">
              <div className="w-full rounded-md border border-slate-700 bg-slate-800/60 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-slate-900"
                    style={{ backgroundColor: '#f59e0b' }}
                  >
                    {step.number}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: '#38bdf8' }}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  {step.content}
                </p>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex items-center justify-center py-2">
                  <ArrowDown size={20} style={{ color: '#f59e0b' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
