import React, { useState, useEffect } from 'react'
import { api } from '../utils/api.js'

export default function AnnotationPage() {
  const [records, setRecords] = useState([])
  const [stages, setStages] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(15)
  const [filterStage, setFilterStage] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSample, setFilterSample] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [editingStage, setEditingStage] = useState(null)

  useEffect(() => {
    api.getStages().then(res => setStages(res.stages))
  }, [])

  useEffect(() => {
    loadRecords()
  }, [page, filterStage, filterStatus, filterSample])

  function loadRecords() {
    const params = { page, pageSize }
    if (filterStage) params.stage = filterStage
    if (filterStatus) params.reviewStatus = filterStatus
    if (filterSample) params.sampleName = filterSample
    api.getRecords(params).then(res => {
      setRecords(res.data)
      setTotal(res.total)
    })
  }

  function handleStageChange(recordId, newStageId) {
    const stageInfo = stages.find(s => s.id === newStageId)
    api.updateRecord(recordId, {
      stage: newStageId,
      stageName: stageInfo ? stageInfo.name : ''
    }).then(() => {
      loadRecords()
      setEditingStage(null)
      if (selectedRecord && selectedRecord.id === recordId) {
        setSelectedRecord(prev => ({
          ...prev,
          stage: newStageId,
          stageName: stageInfo ? stageInfo.name : ''
        }))
      }
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📋 斑马鱼胚胎阶段标注</h1>
        <p className="page-desc">查看和编辑胚胎发育阶段标注，边界记录附带解释说明，方便导师和工程师查阅讲解。</p>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="filter-group">
            <label>发育阶段：</label>
            <select value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(1) }}>
              <option value="">全部阶段</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>复核状态：</label>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">全部状态</option>
              <option value="approved">已通过</option>
              <option value="pending_review">待复核</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
          <div className="filter-group">
            <label>样本名：</label>
            <input
              type="text"
              placeholder="搜索样本"
              value={filterSample}
              onChange={e => { setFilterSample(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>行号</th>
                <th>图片名</th>
                <th>样本名</th>
                <th>标注阶段</th>
                <th>置信度</th>
                <th>边界记录</th>
                <th>异常</th>
                <th>复核状态</th>
                <th>标注人</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id}>
                  <td>{rec.originalRow}</td>
                  <td>
                    <button className="link-btn" onClick={() => { setSelectedRecord(rec); setShowDetail(true) }}>
                      {rec.imageName}
                    </button>
                  </td>
                  <td>{rec.sampleName}</td>
                  <td>
                    {editingStage === rec.id ? (
                      <select
                        value={rec.stage}
                        onChange={e => handleStageChange(rec.id, e.target.value)}
                        onBlur={() => setEditingStage(null)}
                        autoFocus
                      >
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span onClick={() => setEditingStage(rec.id)} style={{ cursor: 'pointer' }}>
                        {rec.stageName}
                        {rec.finalStageName && rec.finalStageName !== rec.stageName && (
                          <span style={{ color: '#10b981', marginLeft: 6 }}>→ {rec.finalStageName}</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td>{rec.confidence}%</td>
                  <td>
                    {rec.isBoundary && <span className="badge badge-warning">边界</span>}
                  </td>
                  <td>
                    {rec.hasAnomaly && <span className="badge badge-error">异常</span>}
                  </td>
                  <td>{getStatusBadge(rec.reviewStatus)}</td>
                  <td>{rec.investigator}</td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => { setSelectedRecord(rec); setShowDetail(true) }}>
                      查看
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

      {showDetail && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">记录详情 - {selectedRecord.imageName}</h3>
              <button className="modal-close" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="dual-layout">
                <div>
                  <div className="image-placeholder">
                    📷 {selectedRecord.imageName}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                    点击查看原图 · 第 {selectedRecord.originalRow} 行 · 来源：{selectedRecord.source}
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom: 12 }}>标注信息</h4>
                  <div className="detail-panel">
                    <div className="detail-row">
                      <span className="detail-label">样本名称</span>
                      <span className="detail-value">{selectedRecord.sampleName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">标注阶段</span>
                      <span className="detail-value">
                        {selectedRecord.stageName}
                        {selectedRecord.finalStageName && (
                          <span style={{ color: '#10b981', marginLeft: 8 }}>
                            (复核结论：{selectedRecord.finalStageName})
                          </span>
                        )}
                      </span>
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
                      <span className="detail-label">复核状态</span>
                      <span className="detail-value">{getStatusBadge(selectedRecord.reviewStatus)}</span>
                    </div>
                    {selectedRecord.reviewer && (
                      <div className="detail-row">
                        <span className="detail-label">复核人</span>
                        <span className="detail-value">{selectedRecord.reviewer}</span>
                      </div>
                    )}
                  </div>

                  {selectedRecord.isBoundary && selectedRecord.boundaryExplanation && (
                    <div className="boundary-note">
                      <strong>📌 边界说明：</strong>
                      <div style={{ marginTop: 4 }}>{selectedRecord.boundaryExplanation}</div>
                    </div>
                  )}

                  {selectedRecord.hasAnomaly && selectedRecord.anomalyDescription && (
                    <div className="anomaly-note">
                      <strong>⚠️ 异常提示：</strong>
                      <div style={{ marginTop: 4 }}>{selectedRecord.anomalyDescription}</div>
                    </div>
                  )}

                  {selectedRecord.reviewComment && (
                    <div className="detail-panel" style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>复核意见</div>
                      <div style={{ fontSize: 13, color: '#475569' }}>{selectedRecord.reviewComment}</div>
                      {selectedRecord.reviewTime && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{selectedRecord.reviewTime}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 10 }}>发育阶段总览</h4>
                <div className="stage-bar">
                  {stages.map(s => (
                    <div
                      key={s.id}
                      className={`stage-block ${selectedRecord.stage === s.id ? 'active' : ''} ${selectedRecord.finalStage === s.id ? 'final' : ''}`}
                      title={s.name}
                    />
                  ))}
                </div>
                <div className="legend" style={{ marginTop: 8 }}>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#3b82f6' }}></div>
                    原始标注
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#10b981' }}></div>
                    复核结论
                  </div>
                </div>
              </div>

              <div className="detail-panel" style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>来源追溯</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  原始行号：第 {selectedRecord.originalRow} 行 · 来源备注：{selectedRecord.notes}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  培养记录版本：{selectedRecord.cultureVersion} · 导入批次：{selectedRecord.importBatch}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetail(false)}>关闭</button>
            </div>
          </div>
  </div>
      )}
    </div>
  )
}
