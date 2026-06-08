import { CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { SampleType } from '@/types'

const typeConfig: Record<SampleType, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', label: '顺利记录' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', label: '待确认记录' },
  error: { icon: XCircle, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200', label: '明显坏数据' },
}

const SampleSelector = () => {
  const { gameState, currentSample, loadSample, getAvailableSamples } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)
  const samples = getAvailableSamples()

  const disabled = gameState.status === 'running'

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        样例数据选择
      </h3>

      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-slate-50 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 cursor-pointer'
          }`}
        >
          {currentSample ? (
            <div className="flex items-center gap-3">
              {(() => {
                const cfg = typeConfig[currentSample.type]
                const Icon = cfg.icon
                return (
                  <>
                    <Icon size={20} className={cfg.color} />
                    <div className="text-left">
                      <div className="font-medium text-slate-800">{currentSample.name}</div>
                      <div className="text-xs text-slate-500">{cfg.label}</div>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <span className="text-slate-500">请选择样例数据</span>
          )}
          <ChevronDown size={20} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
            {samples.map((sample) => {
              const cfg = typeConfig[sample.type]
              const Icon = cfg.icon
              const isSelected = currentSample?.id === sample.id
              return (
                <button
                  key={sample.id}
                  onClick={() => {
                    loadSample(sample.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 ${
                    isSelected ? 'bg-cyan-50' : ''
                  } border-b border-slate-100 last:border-b-0`}
                >
                  <Icon size={20} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{sample.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${cfg.bgColor} ${cfg.color} border`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sample.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {currentSample && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-sm text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700">场景说明：</span>
            {currentSample.description}
          </p>
        </div>
      )}

      {disabled && (
        <p className="mt-2 text-xs text-amber-600">游戏运行中无法切换样例，请先暂停或重开</p>
      )}
    </div>
  )
}

export default SampleSelector
