import type { GrayBreakdown } from '../types'

interface Props {
  breakdown: GrayBreakdown
  baselineMetric: number
}

function pct(delta: number, base: number) {
  if (base === 0) return '0.00%'
  const v = (delta / Math.abs(base)) * 100
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
}

export default function GrayBreakdownView({ breakdown, baselineMetric }: Props) {
  return (
    <div className="detail-section">
      <h4>📊 灰度结果拆解（样本 / 阈值 / 人工改判 三部分拆开）</h4>

      <div className="breakdown-grid">
        <div className="breakdown-item sample">
          <h5>🔵 样本变化</h5>
          <div className="breakdown-delta">{pct(breakdown.sampleChangeDelta, baselineMetric)}</div>
          <div className="breakdown-note">{breakdown.sampleChangeNote}</div>
        </div>
        <div className="breakdown-item threshold">
          <h5>🟡 阈值变化</h5>
          <div className="breakdown-delta">{pct(breakdown.thresholdChangeDelta, baselineMetric)}</div>
          <div className="breakdown-note">{breakdown.thresholdChangeNote}</div>
        </div>
        <div className="breakdown-item manual">
          <h5>🟣 人工改判</h5>
          <div className="breakdown-delta">{pct(breakdown.manualOverrideDelta, baselineMetric)}</div>
          <div className="breakdown-note">{breakdown.manualOverrideNote}</div>
        </div>
      </div>

      <div className="breakdown-total">
        <span className="breakdown-total-label">合计变化</span>
        <span className="breakdown-total-value">{pct(breakdown.totalDelta, baselineMetric)}</span>
      </div>
    </div>
  )
}
