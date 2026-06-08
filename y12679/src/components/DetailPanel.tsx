import { Thermometer, Wind, Layers, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import type { ViolationType } from '@/types'

const violationTypeConfig: Record<ViolationType, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  none: { label: '正常', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
  warning: { label: '警告级越界', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: AlertTriangle },
  critical: { label: '严重越界', color: 'text-rose-600', bgColor: 'bg-rose-100', icon: XCircle },
}

const DetailPanel = () => {
  const { currentSample, crossSections } = useGameStore()

  if (!currentSample) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          实时数据明细
        </h3>
        <div className="text-center py-12 text-slate-400">
          <Layers size={40} className="mx-auto mb-2 opacity-40" />
          <p>请先选择样例数据</p>
        </div>
      </div>
    )
  }

  const violatedCount = crossSections.filter((cs) => cs.isViolated).length
  const normalCount = crossSections.length - violatedCount

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
        实时数据明细
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-lg p-4 border border-cyan-100">
          <div className="flex items-center gap-2 mb-2">
            <Wind size={16} className="text-cyan-600" />
            <span className="text-xs text-cyan-700 font-medium">平均风速</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-cyan-900">
              {currentSample.airflowData.avgVelocity.toFixed(1)}
            </span>
            <span className="text-sm text-cyan-600">m/s</span>
          </div>
          <p className="text-xs text-cyan-600 mt-1">
            {currentSample.airflowData.avgVelocity < 2.5
              ? '流速正常，冷却效果良好'
              : currentSample.airflowData.avgVelocity < 3.5
              ? '流速偏高，注意设备负荷'
              : '流速过高，可能存在气流短路'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer size={16} className="text-orange-600" />
            <span className="text-xs text-orange-700 font-medium">平均温度</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-orange-900">
              {currentSample.airflowData.avgTemperature.toFixed(1)}
            </span>
            <span className="text-sm text-orange-600">°C</span>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            {currentSample.airflowData.avgTemperature < 25
              ? '温度正常，设备运行环境良好'
              : currentSample.airflowData.avgTemperature < 28
              ? '温度偏高，接近安全阈值'
              : '温度过高，需要检查制冷设备'}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">剖切面检测状态</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
              正常 {normalCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">
              越界 {violatedCount}
            </span>
          </div>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {crossSections.map((cs) => {
            const cfg = violationTypeConfig[cs.violationType]
            const Icon = cfg.icon
            return (
              <div
                key={cs.id}
                className={`rounded-lg p-3 border transition-all ${
                  cs.isViolated ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon size={16} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{cs.name}</div>
                      <div className="text-xs text-slate-500">
                        位置: ({cs.positionX}, {cs.positionY}) | 角度: {cs.angle}° | 宽度: {cs.width}px
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${cfg.bgColor} ${cfg.color} font-medium flex-shrink-0`}>
                    {cfg.label}
                  </span>
                </div>

                {cs.violations.length > 0 && (
                  <div className="mt-2 ml-6 space-y-1.5">
                    {cs.violations.map((v, idx) => (
                      <div
                        key={v.id}
                        className="text-xs p-2 bg-white rounded border border-slate-200"
                      >
                        <div className="font-medium text-rose-700">
                          越界 #{idx + 1}: {v.type}
                        </div>
                        <div className="text-slate-600 mt-0.5 leading-relaxed">{v.reason}</div>
                        <div className="text-emerald-700 mt-0.5">
                          💡 {v.suggestedFix}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DetailPanel
