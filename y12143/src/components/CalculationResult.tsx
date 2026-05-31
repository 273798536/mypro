import { usePumpStore } from '@/store/usePumpStore'
import { cn } from '@/lib/utils'
import type { CalculationWarning } from '@/types'
import {
  Gauge,
  Droplets,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react'

const severityBadge: Record<CalculationWarning['severity'], string> = {
  error: 'badge-expired',
  warning: 'badge-warning',
  info: 'badge-info',
}

const severityIcon: Record<CalculationWarning['severity'], React.ReactNode> = {
  error: <XCircle className="h-3.5 w-3.5 shrink-0" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
  info: <Info className="h-3.5 w-3.5 shrink-0" />,
}

const marginColor: Record<string, string> = {
  green: 'text-margin-green',
  yellow: 'text-margin-yellow',
  red: 'text-margin-red',
}

const marginDot: Record<string, string> = {
  green: 'bg-margin-green',
  yellow: 'bg-margin-yellow',
  red: 'bg-margin-red',
}

export default function CalculationResult() {
  const currentSnapshot = usePumpStore((s) => s.currentSnapshot)

  if (!currentSnapshot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
        <Droplets className="h-12 w-12 text-navy-400/40" />
        <p className="text-sm text-navy-200/60">
          暂无计算结果，请先导入数据并执行计算
        </p>
      </div>
    )
  }

  const { velocity, reynolds, frictionLoss, localLoss, totalHeadLoss, requiredHead, marginPercent, matchedPumps, warnings } = currentSnapshot

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-amber" />
            <span className="label-text">流速</span>
          </div>
          <div className="flex items-baseline">
            <span className="value-text">{velocity.toFixed(3)}</span>
            <span className="value-unit">m/s</span>
          </div>
          <p className="mt-1.5 text-[11px] text-navy-300 font-mono">
            Re = {reynolds.toFixed(0)}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-blue-400" />
            <span className="label-text">沿程损失</span>
          </div>
          <div className="flex items-baseline">
            <span className="value-text">{frictionLoss.toFixed(3)}</span>
            <span className="value-unit">mH₂O</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-cyan-400" />
            <span className="label-text">局部损失</span>
          </div>
          <div className="flex items-baseline">
            <span className="value-text">{localLoss.toFixed(3)}</span>
            <span className="value-unit">mH₂O</span>
          </div>
        </div>

        <div className="card card-glow">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-amber" />
            <span className="label-text">总水头损失</span>
          </div>
          <div className="flex items-baseline">
            <span className="value-text text-amber">{totalHeadLoss.toFixed(3)}</span>
            <span className="value-unit">mH₂O</span>
          </div>
        </div>

        <div className="card card-glow">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-amber" />
            <span className="label-text">所需扬程</span>
          </div>
          <div className="flex items-baseline">
            <span className="value-text text-amber">{requiredHead.toFixed(3)}</span>
            <span className="value-unit">mH₂O</span>
          </div>
          <p className="mt-1.5 text-[11px] text-navy-300 font-mono">
            余量系数 {(marginPercent ?? 0) > 0 ? `×${(1 + marginPercent / 100).toFixed(2)}` : '—'}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-margin-green" />
            <span className="label-text">余量校验</span>
          </div>
          {matchedPumps.length === 0 ? (
            <p className="text-xs text-navy-300">无匹配泵型</p>
          ) : (
            <ul className="flex flex-col gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
              {matchedPumps.map((p) => (
                <li key={p.pumpId} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 rounded-full shrink-0',
                      marginDot[p.marginStatus],
                    )}
                  />
                  <span className="text-xs text-navy-100 truncate">
                    {p.pumpName}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs ml-auto',
                      marginColor[p.marginStatus],
                    )}
                  >
                    {p.marginPercent.toFixed(1)}%
                  </span>
                  {p.isExpired && (
                    <span className="badge-expired text-[10px] px-1 py-0 leading-4">
                      过期
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {warnings.map((w, i) => (
            <div
              key={`${w.code}-${i}`}
              className={cn(
                'flex items-start gap-2 rounded-lg px-3 py-2',
                w.severity === 'error' && 'bg-red-500/10 border border-red-500/20',
                w.severity === 'warning' && 'bg-amber/10 border border-amber/20',
                w.severity === 'info' && 'bg-blue-500/10 border border-blue-500/20',
              )}
            >
              {severityIcon[w.severity]}
              <span className={cn('text-xs', severityBadge[w.severity])}>
                {w.code}
              </span>
              <span className="text-xs text-navy-100">{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
