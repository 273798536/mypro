import { useState } from 'react'
import { useReviewStore } from '../store'
import type { ReviewRecord } from '../types'
import RecordDetail from './RecordDetail'
import ThresholdPanel from './ThresholdPanel'

export default function AnalystView() {
  const { records, thresholds } = useReviewStore()
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null)
  const selected: ReviewRecord | undefined = records.find((r) => r.id === selectedId)
  const [tab, setTab] = useState<'overview' | 'breakdown' | 'raw'>('overview')

  const avgBaseline =
    records.reduce((s, r) => s + r.baselineMetric, 0) / Math.max(1, records.length)
  const avgFinal =
    records.reduce((s, r) => s + r.finalMetric, 0) / Math.max(1, records.length)
  const totalManualDelta = records.reduce(
    (s, r) => s + (r.grayBreakdown?.manualOverrideDelta ?? 0),
    0
  )
  const totalSampleDelta = records.reduce(
    (s, r) => s + (r.grayBreakdown?.sampleChangeDelta ?? 0),
    0
  )
  const totalThresholdDelta = records.reduce(
    (s, r) => s + (r.grayBreakdown?.thresholdChangeDelta ?? 0),
    0
  )

  const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(2)}%`

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">整体基线指标</div>
          <div className="stat-value">{avgBaseline.toFixed(4)}</div>
          <div className="stat-sub">{records.length} 条记录平均</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">整体最终指标</div>
          <div className="stat-value">{avgFinal.toFixed(4)}</div>
          <div className="stat-sub">
            变化 {pct(avgFinal - avgBaseline)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">样本变化贡献</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {pct(totalSampleDelta)}
          </div>
          <div className="stat-sub">样本分布导致的指标变动</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">阈值变化贡献</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {pct(totalThresholdDelta)}
          </div>
          <div className="stat-sub">阈值调整导致的指标变动</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">人工改判贡献</div>
          <div className="stat-value" style={{ color: '#7c3aed' }}>
            {pct(totalManualDelta)}
          </div>
          <div className="stat-sub">人工修正产生的指标变动</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-title">🧪 灰度结果拆解报告</div>

            <div className="tabs">
              <button
                className={`tab ${tab === 'overview' ? 'active' : ''}`}
                onClick={() => setTab('overview')}
              >
                总览
              </button>
              <button
                className={`tab ${tab === 'breakdown' ? 'active' : ''}`}
                onClick={() => setTab('breakdown')}
              >
                逐条拆解
              </button>
              <button
                className={`tab ${tab === 'raw' ? 'active' : ''}`}
                onClick={() => setTab('raw')}
              >
                原始数据溯源
              </button>
            </div>

            {tab === 'overview' && (
              <div>
                <div className="breakdown-grid">
                  <div className="breakdown-item sample">
                    <h5>样本变化</h5>
                    <div className="breakdown-delta">{pct(totalSampleDelta)}</div>
                    <div className="breakdown-note">
                      说明：算法工程师小乔无需再解释"指标涨了但不知道样本变没变"
                    </div>
                  </div>
                  <div className="breakdown-item threshold">
                    <h5>阈值变化</h5>
                    <div className="breakdown-delta">{pct(totalThresholdDelta)}</div>
                    <div className="breakdown-note">
                      说明：阈值漂移已挂起处理，不会产生假稳定结论
                    </div>
                  </div>
                  <div className="breakdown-item manual">
                    <h5>人工改判</h5>
                    <div className="breakdown-delta">{pct(totalManualDelta)}</div>
                    <div className="breakdown-note">
                      说明：排班同事所有改判均有历史，可追溯至具体对象
                    </div>
                  </div>
                </div>
                <div className="breakdown-total">
                  <span className="breakdown-total-label">合计变化</span>
                  <span className="breakdown-total-value">
                    {pct(totalSampleDelta + totalThresholdDelta + totalManualDelta)}
                  </span>
                </div>
              </div>
            )}

            {tab === 'breakdown' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {records.map((r) => {
                  const b = r.grayBreakdown
                  if (!b) return null
                  return (
                    <div
                      key={r.id}
                      className="card"
                      style={{ margin: 0, padding: 14, cursor: 'pointer' }}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span className="cr-id">{r.codeReviewId}</span>
                          <span style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>
                            基线 {r.baselineMetric.toFixed(4)} → 最终{' '}
                            {r.finalMetric.toFixed(4)}
                          </span>
                        </div>
                        {selectedId === r.id && (
                          <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>
                            已选中
                          </span>
                        )}
                      </div>
                      <div className="breakdown-grid">
                        <div className="breakdown-item sample">
                          <h5>样本</h5>
                          <div className="breakdown-note">{b.sampleChangeNote}</div>
                        </div>
                        <div className="breakdown-item threshold">
                          <h5>阈值</h5>
                          <div className="breakdown-note">{b.thresholdChangeNote}</div>
                        </div>
                        <div className="breakdown-item manual">
                          <h5>人工改判</h5>
                          <div className="breakdown-note">{b.manualOverrideNote}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'raw' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {records.map((r) => (
                  <div key={r.id} className="card" style={{ margin: 0, padding: 14 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span className="cr-id">{r.codeReviewId}</span>
                      <span style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>
                        共 {r.rawRows.length} 条原始行
                      </span>
                    </div>
                    <table className="raw-rows-table">
                      <thead>
                        <tr>
                          <th>原始行号</th>
                          <th>对象ID</th>
                          <th>对象名</th>
                          <th>原始分</th>
                          <th>原始标签</th>
                          <th>样本哈希</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.rawRows.map((row) => (
                          <tr key={row.id}>
                            <td className="row-num-cell">L{row.rowNumber}</td>
                            <td className="obj-id-cell">{row.objectId}</td>
                            <td>{row.objectName}</td>
                            <td>{row.rawScore.toFixed(3)}</td>
                            <td>{row.rawLabel}</td>
                            <td className="hash-cell">{row.sampleHash}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <ThresholdPanel />
          {selected && <RecordDetail record={selected} compact />}
        </div>
      </div>
    </div>
  )
}
