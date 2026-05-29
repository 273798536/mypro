import { Download, FileText } from 'lucide-react'
import type { ScoreBreakdown, FlightSegment, WindChange, ScoreItem } from '@/types/game'

interface ScoreBreakdownViewProps {
  score: ScoreBreakdown
  segments: FlightSegment[]
  windFieldVersion: number
  windChanges: WindChange[]
  onDownload?: () => void
}

const LABELS: Record<string, string> = {
  pathEfficiency: '路径效率',
  batteryManagement: '电量管理',
  noFlyZoneCompliance: '禁飞区合规',
  returnBatteryMargin: '返航余量',
  headwindHandling: '逆风应对',
}

function ScoreRow({ label, item }: { label: string; item: ScoreItem }) {
  const pct = item.max > 0 ? (item.score / item.max) * 100 : 0
  const barColor =
    pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <span className="text-sm tabular-nums text-slate-100">
          {item.score}<span className="text-slate-500">/{item.max}</span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{item.explanation}</p>
    </div>
  )
}

export default function ScoreBreakdownView({
  score,
  segments,
  windFieldVersion,
  windChanges,
}: ScoreBreakdownViewProps) {
  const headwindSegments = segments.filter(s => s.isHeadwind)

  const handleDownload = () => {
    const lines = [
      '飞行评分报告',
      `总分: ${score.totalScore}/${score.maxTotalScore}`,
      '',
      ...Object.entries(LABELS).map(([key, label]) => {
        const item = score[key as keyof ScoreBreakdown] as ScoreItem
        return `${label}: ${item.score}/${item.max} - ${item.explanation}`
      }),
    ]

    if (headwindSegments.length > 0) {
      lines.push('', '逆风耗电详解')
      headwindSegments.forEach(s => {
        lines.push(
          `航段 ${s.fromWaypoint}→${s.toWaypoint}: 基础耗电 ${s.basePowerCost}% × 逆风系数 ${s.headwindCoefficient} = 实际耗电 ${s.actualPowerCost}%（逆风分量 ${s.headwindExplanation}）`
        )
      })
    }

    if (windFieldVersion === 2 && windChanges.length > 0) {
      lines.push('', '风场变更影响')
      windChanges.forEach((wc, i) => {
        lines.push(
          `区域${i}: 风速 ${wc.previousSpeed}→${wc.newSpeed} m/s, 风向 ${wc.previousDirection}°→${wc.newDirection}°`
        )
        if (wc.affectedFlightSegments.length > 0) {
          lines.push(`  影响航段: ${wc.affectedFlightSegments.join(', ')}`)
        }
      })
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flight-score-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5 p-5 rounded-xl bg-slate-900/90 border border-slate-700/50 max-w-xl mx-auto">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-[#06d6a0]" />
        <h2 className="text-lg font-bold text-slate-100">飞行评分报告</h2>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(LABELS).map(([key, label]) => (
          <ScoreRow key={key} label={label} item={score[key as keyof ScoreBreakdown] as ScoreItem} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-800/60 border border-[#06d6a0]/20 shadow-[0_0_16px_rgba(6,214,160,0.1)]">
        <span className="text-sm text-slate-400">总分</span>
        <span className="text-2xl font-bold text-[#06d6a0] tabular-nums">
          {score.totalScore}
          <span className="text-base text-slate-500">/{score.maxTotalScore}</span>
        </span>
      </div>

      {headwindSegments.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-orange-400">逆风耗电详解</h3>
          {headwindSegments.map((s, i) => (
            <div key={i} className="text-[11px] text-slate-400 leading-relaxed pl-3 border-l-2 border-orange-500/30">
              航段 {s.fromWaypoint}→{s.toWaypoint}: 基础耗电 {s.basePowerCost}% × 逆风系数 {s.headwindCoefficient} = 实际耗电 {s.actualPowerCost}%（逆风分量 {s.headwindExplanation}）
            </div>
          ))}
        </div>
      )}

      {windFieldVersion === 2 && windChanges.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-cyan-400">风场变更影响</h3>
          {windChanges.map((wc, i) => (
            <div key={i} className="text-[11px] text-slate-400 leading-relaxed pl-3 border-l-2 border-cyan-500/30">
              区域{i}: 风速 {wc.previousSpeed}→{wc.newSpeed} m/s, 风向 {wc.previousDirection}°→{wc.newDirection}°
              {wc.affectedFlightSegments.length > 0 && (
                <span className="text-slate-500 ml-1">（影响: {wc.affectedFlightSegments.join(', ')}）</span>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleDownload}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#06d6a0]/10 text-[#06d6a0] border border-[#06d6a0]/30 text-sm font-medium transition-all hover:bg-[#06d6a0]/20 hover:shadow-[0_0_12px_rgba(6,214,160,0.2)]"
      >
        <Download size={16} />
        下载报告
      </button>
    </div>
  )
}
