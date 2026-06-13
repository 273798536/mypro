import { AlertTriangle, Calculator } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function ParamPanel() {
  const thresholds = useStore((s) => s.thresholds)
  const updateThreshold = useStore((s) => s.updateThreshold)
  const recalculate = useStore((s) => s.recalculate)

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-6">
      <h2 className="mb-6 text-xl font-bold text-white">阈值参数调整</h2>

      <div className="flex flex-col gap-4">
        {thresholds.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-gray-700/50 bg-[#1a1a2e]/80 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-base font-semibold text-white">
                {t.parameter}
              </span>
              {t.wasTampered && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                  <AlertTriangle size={12} />
                  篡改
                </span>
              )}
            </div>

            <div className="mb-2 text-sm text-gray-400">
              公式参考: <span className="text-gray-300">{t.formulaRef}</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={t.value}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) updateThreshold(t.id, v)
                }}
                className="w-28 rounded-md border border-gray-600 bg-[#16213e] px-3 py-1.5 text-sm text-amber-400 outline-none focus:border-amber-500"
              />
              <span className="text-sm text-gray-400">{t.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={recalculate}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-amber-400"
      >
        <Calculator size={16} />
        复算
      </button>
    </div>
  )
}
