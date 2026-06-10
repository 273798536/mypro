import React, { useState, useEffect } from 'react'
import { api } from '../utils/api.js'

export default function ReviewPage() {
  const [records, setRecords] = useState([])
  const [stages, setStages] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [tab, setTab] = useState('pending')
  const [selectedIds, setSelectedIds] = useState([])
  const [reviewComment, setReviewComment] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewResult, setReviewResult] = useState('approved')
  const [finalStage, setFinalStage] = useState('')
  const [reviewerName, setReviewerName] = useState('导师-张老师')

  useEffect(() => {
    api.getStages().then(res => setStages(res.stages))
  }, [])

  useEffect(() => {
    loadRecords()
  }, [page, tab])

  function loadRecords() {
    const params = { page, pageSize }
    if (tab === 'pending') params.reviewStatus = 'pending_review'
    else if (tab === 'anomaly') params.hasAnomaly = 'true'
    else if (tab === 'boundary') params.isBoundary = 'true'
    else if (tab === 'approved') params.reviewStatus = 'approved'
    api.getRecords(params).then(res => {
      setRecords(res.data)
      setTotal(res.total)
      setSelectedIds([])
    })
  }

  function toggleSelect(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === records.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(records.map(r => r.id))
    }
  }

  function openReviewModal(record) {
    setSelectedRecord(record)
    setFinalStage(record.stage)
    setReviewResult('approved')
    setReviewComment('')
    setShowReviewModal(true)
  }

  function handleSubmitReview() {
    if (!selectedRecord) return

    const stageInfo = stages.find(s => s.id === finalStage)
    api.reviewRecord(selectedRecord.id, {
      reviewStatus: reviewResult,
      reviewer: reviewerName,
      reviewComment,
      finalStage,
      finalStageName: stageInfo ? stageInfo.name : ''
    }).then(() => {
      setShowReviewModal(false)
      loadRecords()
    })
  }

  function handleBatchReview(status) {
    if (selectedIds.length === 0) {
      alert('请先选择要复核的记录')
      return
    }
    api.batchReview({
      ids: selectedIds,
      reviewStatus: status,
      reviewer: reviewerName,
      reviewComment: reviewComment || '批量复核'
    }).then(() => {
      setReviewComment('')
      loadRecords()
    })
  }

  function getStatusBadge(status) {
    const map = {
      approved: ['badge-success', '已通过'],
      pending_review: ['badge-warning', '待复核'],
      rejected: ['badge-error', '已驳回']
    }
    const [cls, text] = map[status] || ['badge-secondary', '未知']
    return <span className={`badge ${cls}`}>{text}</span>
  }

  const totalPages = Math.ceil(total / pageSize)
  const tabs = [
    { key: 'pending', label: '待复核', count: null },
    { key: 'anomaly', label: '异常记录', count: null },
    { key: 'boundary', label: '边界记录', count: null },
    { key: 'approved', label: '已通过', count: null }
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔍 异常复核与人工修正</h1>
        <p className="page-desc">对异常和边界记录进行复核，保留原始行号、图片名和来源备注，确保每条结论都可追溯。</p>
      </div>

      <div className="card">
        <div className="tabs">
          {tabs.map(t => (
            <div
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => { setTab(t.key); setPage(1) }}
            >
              {t.label}
            </div>
          ))}
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <label>复核人：</label>
            <input
              type="text"
              value={reviewerName}
              onChange={e => setReviewerName(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
          <div style={{ flex: 1 }} />
          {tab === 'pending' && (
            <>
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="批量复核意见（可选）"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  style={{ width: 200 }}
                />
              </div>
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleBatchReview('approved')}
                disabled={selectedIds.length === 0}
              >
                ✓ 批量通过 ({selectedIds.length})
              </button>
              <button
                className="btn btn-sm btn-warning"
                onClick={() => handleBatchReview('rejected')}
                disabled={selectedIds.length === 0}
              >
                ✗ 批量驳回 ({selectedIds.length})
              </button>
            </>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                {tab === 'pending' && <th style={{ width: 36 }}><input type="checkbox" checked={selectedIds.length === records.length && records.length > 0} onChange={toggleSelectAll} /></th>}
                <th>行号</th>
                <th>图片名</th>
                <th>样本名</th>
                <th>原始标注</th>
                <th>置信度</th>
                <th>异常/边界</th>
                <th>复核状态</th>
                <th>标注人</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id}>
                  {tab === 'pending' && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(rec.id)}
                        onChange={() => toggleSelect(rec.id)}
                      />
                    </td>
                  )}
                  <td>{rec.originalRow}</td>
                  <td style={{ fontWeight: 500 }}>{rec.imageName}</td>
                  <td>{rec.sampleName}</td>
                  <td>
                    {rec.stageName}
                    {rec.finalStageName && rec.finalStageName !== rec.stageName && (
                      <div style={{ color: '#10b981', fontSize: 11 }}>→ {rec.finalStageName}</div>
                    )}
                  </td>
                  <td>{rec.confidence}%</td>
                  <td>
                    {rec.hasAnomaly && <span className="badge badge-error" style={{ marginRight: 4 }}>异常</span>}
                    {rec.isBoundary && <span className="badge badge-warning">边界</span>}
                  </td>
                  <td>{getStatusBadge(rec.reviewStatus)}</td>
                  <td>{rec.investigator}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{rec.source}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => openReviewModal(rec)}>
                      复核
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>上一页</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map(p => (
            <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>下一页</button>
          <span style={{ marginLeft: 12, fontSize: 13, color: '#64748b' }}>共 {total} 条</span>
        </div>
      </div>

      {showReviewModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">复核记录 - {selectedRecord.imageName}</h3>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="dual-layout">
                <div>
                  <div className="image-placeholder">
                    📷 {selectedRecord.imageName}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                    第 {selectedRecord.originalRow} 行 · {selectedRecord.source}
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom: 12 }}>原始标注</h4>
                  <div className="detail-panel">
                    <div className="detail-row">
                      <span className="detail-label">发育阶段</span>
                      <span className="detail-value">{selectedRecord.stageName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">置信度</span>
                      <span className="detail-value">{selectedRecord.confidence}%</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">标注人</span>
                      <span className="detail-value">{selectedRecord.investigator}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">培养版本</span>
                      <span className="detail-value">{selectedRecord.cultureVersion}</span>
                    </div>
                  </div>

                  {selectedRecord.isBoundary && selectedRecord.boundaryExplanation && (
                    <div className="boundary-note">
                      <strong>📌 边界说明：</strong>
                      <div style={{ marginTop: 4 }}>{selectedRecord.boundaryExplanation}</div>
                    </div>
                  )}

                  {selectedRecord.hasAnomaly && selectedRecord.anomalyDescription && (
                    <div className="anomaly-note">
                      <strong>⚠️ 异常描述：</strong>
                      <div style={{ marginTop: 4 }}>{selectedRecord.anomalyDescription}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <h4 style={{ marginBottom: 12 }}>复核结论</h4>
                <div className="detail-panel">
                  <div className="detail-row">
                    <span className="detail-label">最终阶段</span>
                    <span className="detail-value">
                      <select value={finalStage} onChange={e => setFinalStage(e.target.value)}>
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.hours}h)</option>
                        ))}
                      </select>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">复核结果</span>
                    <span className="detail-value">
                      <label className="checkbox-label" style={{ marginRight: 16 }}>
                        <input type="radio" value="approved" checked={reviewResult === 'approved'} onChange={() => setReviewResult('approved')} />
                        通过
                      </label>
                      <label className="checkbox-label">
                        <input type="radio" value="rejected" checked={reviewResult === 'rejected'} onChange={() => setReviewResult('rejected')} />
                        驳回
                      </label>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">复核意见</span>
                    <span className="detail-value">
                      <textarea
                        className="textarea"
                        placeholder="请填写复核意见，便于追溯和讲解..."
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-panel" style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>来源信息链</div>
                <div className="trace-timeline">
                  <div className="trace-item">
                    <div className="trace-type">原始表格记录</div>
                    <div className="trace-detail">Excel 第 {selectedRecord.originalRow} 行 · {selectedRecord.imageName}</div>
                    <div className="trace-time">{selectedRecord.importTime}</div>
                  </div>
                  <div className="trace-item">
                    <div className="trace-type">标注人</div>
                    <div className="trace-detail">{selectedRecord.investigator}</div>
                    <div className="trace-time">{selectedRecord.importTime}</div>
                  </div>
                  <div className="trace-item">
                    <div className="trace-type">来源备注</div>
                    <div className="trace-detail">{selectedRecord.notes}</div>
                  </div>
                  <div className="trace-item">
                    <div className="trace-type">培养记录版本</div>
                    <div className="trace-detail">{selectedRecord.cultureVersion}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReviewModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSubmitReview}>确认复核</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
