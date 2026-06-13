import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { useAttributionStore } from '@/store'
import { cn } from '@/lib/utils'

function getErrorColor(error: number) {
  if (error > 6) return 'text-[#FF6B35]'
  if (error >= 4) return 'text-[#F59E0B]'
  return 'text-[#2ECC71]'
}

function getErrorBg(error: number) {
  if (error > 6) return 'bg-[#FF6B35]/10 border-[#FF6B35]/30'
  if (error >= 4) return 'bg-[#F59E0B]/10 border-[#F59E0B]/30'
  return 'bg-[#2ECC71]/10 border-[#2ECC71]/30'
}

function getConclusion(error: number, name: string) {
  if (error > 6) return `${name}扭矩偏差超出安全阈值，存在高风险，建议立即排查材料与装配工艺`
  if (error >= 4) return `${name}扭矩偏差接近安全阈值，需关注并加强过程监控`
  return `${name}扭矩偏差在安全范围内，运行状态正常`
}

export default function AttributionPanel() {
  const { selectedComponent, filteredRecords, parameterSet } = useAttributionStore()

  if (!selectedComponent) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-white/5 bg-[#1B2A4A] p-6">
        <span className="text-sm text-white/40">请选择零部件</span>
      </div>
    )
  }

  const avgError =
    filteredRecords.length > 0
      ? filteredRecords.reduce((s, r) => s + r.errorPercent, 0) / filteredRecords.length
      : 0

  const passed = avgError < parameterSet.safetyThreshold

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/5 bg-[#1B2A4A] p-5">
      <h3 className="text-sm font-medium text-white/70">归因结果</h3>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
        <p className="text-xs text-white/50">零部件</p>
        <p className="mt-1 text-base font-semibold text-white">{selectedComponent.name}</p>
      </div>

      <div className={cn('rounded-lg border p-4', getErrorBg(avgError))}>
        <p className="text-xs text-white/50">当前误差</p>
        <p className={cn('mt-1 text-2xl font-bold', getErrorColor(avgError))}>
          {avgError.toFixed(2)}%
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-4">
        {passed ? (
          <CheckCircle className="h-5 w-5 shrink-0 text-[#2ECC71]" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#FF6B35]" />
        )}
        <div>
          <p className="text-xs text-white/50">安全阈值判定</p>
          <p className={cn('text-sm font-medium', passed ? 'text-[#2ECC71]' : 'text-[#FF6B35]')}>
            {passed ? '通过' : '未通过'}（阈值 {parameterSet.safetyThreshold}%）
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
        <p className="text-xs text-white/50">归因结论</p>
        <p className="mt-1 text-sm leading-relaxed text-white/80">
          {getConclusion(avgError, selectedComponent.name)}
        </p>
      </div>

      <a
        href={`/trace?componentId=${selectedComponent.id}`}
        className="mt-auto flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.1] hover:text-white"
      >
        查看材料追溯
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  )
}
