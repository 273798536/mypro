import { useReviewStore } from '../store'

export default function ThresholdPanel() {
  const { thresholds, updateThreshold } = useReviewStore()

  return (
    <div className="card">
      <div className="card-title">⚙️ 阈值监控 & 漂移检测</div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        超过漂移容忍度会自动挂起对应记录，拒绝给出假稳定结论。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {thresholds.map((t) => {
          const ratio =
            t.baselineValue === 0
              ? 0
              : Math.abs(t.currentValue - t.baselineValue) / Math.abs(t.baselineValue)
          return (
            <div key={t.id} className="threshold-item">
              <div className="threshold-meta">
                <span>
                  <span className="threshold-name">{t.metricName}</span>
                  <span
                    className={`threshold-drift-tag ${t.isDrifted ? 'yes' : 'no'}`}
                  >
                    {t.isDrifted ? '已漂移' : '正常'}
                  </span>
                </span>
                <span className="threshold-sub">
                  基线 {t.baselineValue.toFixed(3)} · 当前{' '}
                  {t.currentValue.toFixed(3)} · 容忍度 ±
                  {(t.driftTolerance * 100).toFixed(0)}% · 实际偏差{' '}
                  {(ratio * 100).toFixed(2)}% · 更新人：{t.updatedBy}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={t.currentValue}
                  style={{ width: 90 }}
                  onChange={(e) => updateThreshold(t.id, Number(e.target.value))}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
