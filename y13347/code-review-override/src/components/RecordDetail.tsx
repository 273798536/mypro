import { useState } from 'react'
import { useReviewStore } from '../store'
import type { ReviewRecord } from '../types'
import HistoryTimeline from './HistoryTimeline'
import GrayBreakdownView from './GrayBreakdownView'
import RawRowsView from './RawRowsView'

interface Props {
  record: ReviewRecord
  compact?: boolean
}

export default function RecordDetail({ record, compact = false }: Props) {
  const {
    updateNote,
    attachScreenshot,
    confirmSuspended,
    changeRecordStatus,
    addSupplementRecord,
    recomputeGrayBreakdown,
  } = useReviewStore()

  const [note, setNote] = useState(record.currentNote)
  const [screenshotUrl, setScreenshotUrl] = useState(record.currentScreenshotUrl ?? '')
  const [sampleDelta, setSampleDelta] = useState(record.grayBreakdown?.sampleChangeDelta ?? 0)
  const [thresholdDelta, setThresholdDelta] = useState(
    record.grayBreakdown?.thresholdChangeDelta ?? 0
  )
  const [manualDelta, setManualDelta] = useState(record.grayBreakdown?.manualOverrideDelta ?? 0)
  const [tab, setTab] = useState<'summary' | 'history' | 'raw' | 'breakdown'>('summary')
  const [supplementNote, setSupplementNote] = useState('')

  const saveNote = () => updateNote(record.id, note)
  const saveScreenshot = () => screenshotUrl && attachScreenshot(record.id, screenshotUrl)
  const recompute = () =>
    recomputeGrayBreakdown(record.id, {
      sampleChange: sampleDelta,
      thresholdChange: thresholdDelta,
      manualOverride: manualDelta,
    })

  const delta = record.finalMetric - record.baselineMetric
  const deltaPct =
    record.baselineMetric === 0 ? 0 : (delta / Math.abs(record.baselineMetric)) * 100

  return (
    <div className="card">
      <div className="card-title">
        🔍 {record.codeReviewId} 详情
        {record.status === 'suspended' && (
          <span className="badge badge-suspended" style={{ marginLeft: 8 }}>
            已挂起
          </span>
        )}
      </div>

      {record.status === 'suspended' && record.suspendedReason && (
        <div className="drift-warning">
          <h4>⚠️ 阈值漂移告警</h4>
          <p>{record.suspendedReason}</p>
          <div className="drift-actions">
            <button
              className="btn btn-success"
              onClick={() => confirmSuspended(record.id, true)}
            >
              确认漂移并接受结果
            </button>
            <button
              className="btn btn-danger"
              onClick={() => confirmSuspended(record.id, false)}
            >
              判定为异常数据
            </button>
          </div>
        </div>
      )}

      {!compact && (
        <div className="tabs">
          <button className={`tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
            概览 & 操作
          </button>
          <button className={`tab ${tab === 'breakdown' ? 'active' : ''}`} onClick={() => setTab('breakdown')}>
            灰度拆解
          </button>
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            历史版本 ({record.history.length})
          </button>
          <button className={`tab ${tab === 'raw' ? 'active' : ''}`} onClick={() => setTab('raw')}>
            原始行溯源
          </button>
        </div>
      )}

      {(tab === 'summary' || compact) && (
        <div className="detail-section">
          <div className="field-row">
            <span className="field-label">基线指标</span>
            <span className="field-value">{record.baselineMetric.toFixed(4)}</span>
          </div>
          <div className="field-row">
            <span className="field-label">算法产出</span>
            <span className="field-value">{record.algorithmMetric.toFixed(4)}</span>
          </div>
          <div className="field-row">
            <span className="field-label">最终值</span>
            <span className={`field-value ${delta > 0 ? 'metric-up' : delta < 0 ? 'metric-down' : ''}`}>
              {record.finalMetric.toFixed(4)} ({delta > 0 ? '+' : ''}
              {delta.toFixed(4)} / {delta > 0 ? '+' : ''}
              {deltaPct.toFixed(2)}%)
            </span>
          </div>
          <div className="field-row">
            <span className="field-label">负责人</span>
            <span className="field-value">{record.assignedTo}</span>
          </div>
          <div className="field-row">
            <span className="field-label">创建时间</span>
            <span className="field-value">
              {new Date(record.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
          <div className="field-row">
            <span className="field-label">更新时间</span>
            <span className="field-value">
              {new Date(record.updatedAt).toLocaleString('zh-CN')}
            </span>
          </div>

          <div className="detail-section" style={{ marginTop: 14 }}>
            <h4>📝 备注（会保留历史版本）</h4>
            <textarea
              className="textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="输入备注，保存后会追加到历史而非覆盖"
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={saveNote}>
                保存备注（追加历史）
              </button>
            </div>
          </div>

          <div className="detail-section">
            <h4>🖼 截图（会保留历史版本）</h4>
            <input
              className="input"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              placeholder="截图URL / 路径，保存后会进入历史"
            />
            {record.currentScreenshotUrl && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                当前：{record.currentScreenshotUrl}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={saveScreenshot}>
                附上截图（追加历史）
              </button>
            </div>
          </div>

          <div className="detail-section">
            <h4>🔄 灰度拆解手动调整</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>样本变化</label>
                <input
                  className="input"
                  type="number"
                  step="0.001"
                  value={sampleDelta}
                  onChange={(e) => setSampleDelta(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>阈值变化</label>
                <input
                  className="input"
                  type="number"
                  step="0.001"
                  value={thresholdDelta}
                  onChange={(e) => setThresholdDelta(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>人工改判</label>
                <input
                  className="input"
                  type="number"
                  step="0.001"
                  value={manualDelta}
                  onChange={(e) => setManualDelta(Number(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={recompute}>
                重新计算灰度拆解
              </button>
            </div>
          </div>

          <div className="detail-section">
            <h4>✅ 状态流转</h4>
            <div className="btn-group">
              {record.status !== 'processing' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => changeRecordStatus(record.id, 'processing', '恢复处理中')}
                >
                  设为处理中
                </button>
              )}
              {record.status !== 'confirmed' && record.status !== 'suspended' && (
                <button
                  className="btn btn-success"
                  onClick={() => changeRecordStatus(record.id, 'confirmed', '人工确认通过')}
                >
                  确认通过
                </button>
              )}
              {record.status !== 'anomaly' && (
                <button
                  className="btn btn-danger"
                  onClick={() => changeRecordStatus(record.id, 'anomaly', '人工判定为异常')}
                >
                  标记异常
                </button>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h4>➕ 补录记录（会创建新记录并关联）</h4>
            <textarea
              className="textarea"
              value={supplementNote}
              onChange={(e) => setSupplementNote(e.target.value)}
              placeholder="说明补录原因，将基于当前记录创建一条补录记录"
            />
            <div style={{ marginTop: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (supplementNote.trim()) {
                    addSupplementRecord(record.id, supplementNote)
                    setSupplementNote('')
                  }
                }}
              >
                创建补录记录
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && !compact && <HistoryTimeline record={record} />}
      {tab === 'breakdown' && !compact && record.grayBreakdown && (
        <GrayBreakdownView breakdown={record.grayBreakdown} baselineMetric={record.baselineMetric} />
      )}
      {tab === 'raw' && !compact && <RawRowsView rows={record.rawRows} />}
    </div>
  )
}
