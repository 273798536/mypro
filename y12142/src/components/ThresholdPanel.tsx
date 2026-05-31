import { Shield, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { useStore, thresholdVersions, thresholdConfigs, maintenanceRecords as allMaintenanceRecords, readings as allReadings, TIME_RANGE } from '@/store/useStore'
import { SEVERITY_LABELS, ANOMALY_LABELS } from '@/types'
import type { SeverityLevel, AnomalyType, ThresholdConfig } from '@/types'
import { cn } from '@/lib/utils'

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
}

const SEVERITY_ICONS: Record<SeverityLevel, React.ElementType> = {
  normal: CheckCircle,
  warning: AlertTriangle,
  critical: AlertCircle,
}

const ANOMALY_COLORS: Record<AnomalyType, string> = {
  normal: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
  drift: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  threshold_version_error: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  missing_sample: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

function ConfigTable({ config, versionName }: { config: ThresholdConfig; versionName: string }) {
  const rows = [
    ['版本', versionName],
    ['温度预警', `${config.tempWarning}°C`],
    ['温度严重', `${config.tempCritical}°C`],
    ['电压预警', `${config.voltWarning}V`],
    ['电压严重', `${config.voltCritical}V`],
    ['漂移容差', `${config.driftTolerance}°C`],
  ]
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([key, val]) => (
          <tr key={key} className="border-b border-gray-700/50">
            <td className="py-1.5 pr-3 text-gray-400 whitespace-nowrap">{key}</td>
            <td className="py-1.5 text-right text-gray-200 font-mono">{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function VersionComparison() {
  const oldConfig = thresholdConfigs.find((c) => c.versionId === 'v1')!
  const newConfig = thresholdConfigs.find((c) => c.versionId === 'v2')!
  const oldName = thresholdVersions.find((v) => v.id === 'v1')?.name ?? 'v1'
  const newName = thresholdVersions.find((v) => v.id === 'v2')?.name ?? 'v2'

  return (
    <div className="mt-3 rounded border border-gray-700 bg-gray-800/40 p-3">
      <div className="mb-2 text-xs text-gray-400">新旧版本阈值对比</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="pb-1 text-left font-normal">参数</th>
            <th className="pb-1 text-right font-normal">{oldName}</th>
            <th className="pb-1 text-right font-normal">{newName}</th>
          </tr>
        </thead>
        <tbody className="text-gray-300 font-mono">
          <tr className="border-t border-gray-700/40">
            <td className="py-1 text-gray-400 font-sans">温度预警</td>
            <td className="py-1 text-right">{oldConfig.tempWarning}°C</td>
            <td className="py-1 text-right text-amber-400">{newConfig.tempWarning}°C</td>
          </tr>
          <tr className="border-t border-gray-700/40">
            <td className="py-1 text-gray-400 font-sans">温度严重</td>
            <td className="py-1 text-right">{oldConfig.tempCritical}°C</td>
            <td className="py-1 text-right text-amber-400">{newConfig.tempCritical}°C</td>
          </tr>
          <tr className="border-t border-gray-700/40">
            <td className="py-1 text-gray-400 font-sans">电压预警</td>
            <td className="py-1 text-right">{oldConfig.voltWarning}V</td>
            <td className="py-1 text-right text-amber-400">{newConfig.voltWarning}V</td>
          </tr>
          <tr className="border-t border-gray-700/40">
            <td className="py-1 text-gray-400 font-sans">漂移容差</td>
            <td className="py-1 text-right">{oldConfig.driftTolerance}°C</td>
            <td className="py-1 text-right text-amber-400">{newConfig.driftTolerance}°C</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function ThresholdPanel() {
  const selectedCellId = useStore((s) => s.selectedCellId)
  const thresholdVersionId = useStore((s) => s.thresholdVersionId)
  const checkThreshold = useStore((s) => s.checkThreshold)

  if (!selectedCellId) {
    return (
      <div className={cn('flex h-full flex-col rounded-lg border border-gray-700 bg-[#0d1117]')}>
        <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-3">
          <Shield className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-medium text-gray-200">阈值校验</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-sm text-gray-500">点击 3D 电芯查看校验结果</p>
        </div>
      </div>
    )
  }

  const result = checkThreshold(selectedCellId)
  const config = thresholdConfigs.find((c) => c.versionId === thresholdVersionId) || thresholdConfigs[0]
  const versionName = thresholdVersions.find((v) => v.id === thresholdVersionId)?.name ?? thresholdVersionId
  const SeverityIcon = SEVERITY_ICONS[result.severity]

  return (
    <div className={cn('flex h-full flex-col rounded-lg border border-gray-700 bg-[#0d1117]')}>
      <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-3">
        <Shield className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-medium text-gray-200">阈值校验</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="mb-2 text-xs text-gray-500 uppercase tracking-wider">当前阈值配置</div>
          <ConfigTable config={config} versionName={versionName} />
        </div>

        <div className="border-t border-gray-700/50 pt-4">
          <div className="mb-2 text-xs text-gray-500 uppercase tracking-wider">校验结果</div>
          <div className="flex items-center gap-2 mb-3">
            <SeverityIcon className={cn('h-4 w-4', result.severity === 'normal' ? 'text-emerald-400' : result.severity === 'warning' ? 'text-amber-400' : 'text-red-400')} />
            <Badge label={SEVERITY_LABELS[result.severity]} className={SEVERITY_COLORS[result.severity]} />
            {result.anomalyType !== 'normal' && (
              <Badge label={ANOMALY_LABELS[result.anomalyType]} className={ANOMALY_COLORS[result.anomalyType]} />
            )}
          </div>
          <div className="text-sm text-gray-200 font-medium">{result.message}</div>
        </div>

        {result.detail && (
          <div className="border-t border-gray-700/50 pt-4">
            <div className="mb-2 text-xs text-gray-500 uppercase tracking-wider">详细说明</div>
            <p className="text-sm text-gray-400 leading-relaxed">{result.detail}</p>
          </div>
        )}

        {result.anomalyType === 'threshold_version_error' && <VersionComparison />}
      </div>
    </div>
  )
}
