import React, { useState, useEffect } from 'react'
import { api } from '../utils/api.js'

export default function TracePage() {
  const [records, setRecords] = useState([])
  const [stages, setStages] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [traceInfo, setTraceInfo] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    api.getStages().then(res => setStages(res.stages))
    loadRecords()
  }, [filterType])

  function loadRecords() {
    const params = { pageSize: 50 }
    if (filterType === 'anomaly') params.hasAnomaly = 'true'
    if (filterType === 'boundary') params.isBoundary = 'true'
    if (filterType === 'reviewed') params.reviewStatus = 'approved'
    api.getRecords(params).then(res => setRecords(res.data))
  }

  function handleSelectRecord(record) {
    setSelectedRecord(record)
    api.getTrace(record.id).then(res => setTraceInfo(res))
  }

  function handleImageClick(record) {
    handleSelectRecord(record)
  }

  function navigateRecord(direction) {
    const idx = records.findIndex(r => r.id === selectedRecord.id)
    if (idx === -1) return
    const nextIdx = direction === 'next'
      ? Math.min(records.length - 1, idx + 1)
      : Math.max(0, idx - 1)
    handleSelectRecord(records[nextIdx])
  }

  const filteredRecords = searchText
    ? records.filter(r =>
        r.imageName.toLowerCase().includes(searchText.toLowerCase()) ||
        r.sampleName.toLowerCase().includes(searchText.toLowerCase()) ||
        r.notes?.toLowerCase().includes(searchText.toLowerCase())
      )
    : records

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔄 复盘溯源</h1>
        <p className="page-desc">从显微照片直达最终结论，从结论点回原始材料。保留原始行号、图片名、来源备注和培养记录版本，复盘不再人工查表。</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">📷 记录列表</div>
          <div className="filter-bar" style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="搜索图片/样本/备注..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: '全部' },
              { key: 'anomaly', label: '异常' },
              { key: 'boundary', label: '边界' },
              { key: 'reviewed', label: '已复核' }
            ].map(f => (
              <button
                key={f.key}
                className={`btn btn-sm ${filterType === f.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterType(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
            {filteredRecords.map(rec => (
              <div
                key={rec.id}
                onClick={() => handleSelectRecord(rec)}
                style={{
                  padding: 10,
                  marginBottom: 6,
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: selectedRecord?.id === rec.id ? '#eff6ff' : '#f8fafc',
                  border: selectedRecord?.id === rec.id ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    flexShrink: 0
                  }}>
                    图
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.imageName}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {rec.stageName}
                      {rec.finalStageName && rec.finalStageName !== rec.stageName && (
                        <span style={{ color: '#10b981' }}> → {rec.finalStageName}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {rec.hasAnomaly && <span className="badge badge-error" style={{ fontSize: 10 }}>异常</span>}
                  {rec.isBoundary && <span className="badge badge-warning" style={{ fontSize: 10 }}>边界</span>}
                  {rec.reviewStatus === 'approved' && <span className="badge badge-success" style={{ fontSize: 10 }}>通过</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {selectedRecord ? (
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600 }}>{selectedRecord.imageName}</h3>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                      {selectedRecord.sampleName} · 第 {selectedRecord.originalRow} 行 · {selectedRecord.source}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigateRecord('prev')}
                      disabled={records.findIndex(r => r.id === selectedRecord.id) <= 0}
                    >
                      ← 上一张
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigateRecord('next')}
                      disabled={records.findIndex(r => r.id === selectedRecord.id) >= records.length - 1}
                    >
                      下一张 →
                    </button>
                  </div>
                </div>

                <div className="dual-layout">
                  <div>
                    <div
                      className="image-placeholder"
                      style={{ height: 280, cursor: 'pointer' }}
                      onClick={() => handleImageClick(selectedRecord)}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>🔬</div>
                        <div>点击查看原图</div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{selectedRecord.imageName}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                      原始表格第 {selectedRecord.originalRow} 行 · 培养记录版本：{selectedRecord.cultureVersion}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ marginBottom: 12 }}>结论信息</h4>
                    <div className="detail-panel">
                      <div className="detail-row">
                        <span className="detail-label">原始标注</span>
                        <span className="detail-value">{selectedRecord.stageName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">最终结论</span>
                        <span className="detail-value" style={{ color: '#10b981', fontWeight: 600 }}>
                          {selectedRecord.finalStageName || selectedRecord.stageName}
                          {selectedRecord.finalStageName && ' (复核后)'}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">置信度</span>
                        <span className="detail-value">{selectedRecord.confidence}%</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">复核状态</span>
                        <span className="detail-value">
                          {selectedRecord.reviewStatus === 'approved' && <span className="badge badge-success">已通过</span>}
                          {selectedRecord.reviewStatus === 'pending_review' && <span className="badge badge-warning">待复核</span>}
                          {selectedRecord.reviewStatus === 'rejected' && <span className="badge badge-error">已驳回</span>}
                        </span>
                      </div>
                      {selectedRecord.reviewer && (
                        <div className="detail-row">
                          <span className="detail-label">复核人</span>
                          <span className="detail-value">{selectedRecord.reviewer}</span>
                        </div>
                      )}
                    </div>

                    {selectedRecord.isBoundary && selectedRecord.boundaryExplanation && (
                      <div className="boundary-note" style={{ marginTop: 12 }}>
                        <strong>📌 边界判定解释：</strong>
                        <div style={{ marginTop: 4 }}>{selectedRecord.boundaryExplanation}</div>
                      </div>
                    )}

                    {selectedRecord.hasAnomaly && selectedRecord.anomalyDescription && (
                      <div className="anomaly-note" style={{ marginTop: 12 }}>
                        <strong>⚠️ 异常情况：</strong>
                        <div style={{ marginTop: 4 }}>{selectedRecord.anomalyDescription}</div>
                      </div>
                    )}

                    {selectedRecord.reviewComment && (
                      <div className="detail-panel" style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>💬 复核意见</div>
                        <div style={{ fontSize: 13, color: '#475569' }}>{selectedRecord.reviewComment}</div>
                        {selectedRecord.reviewTime && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{selectedRecord.reviewTime}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {traceInfo && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-title">🔗 来源追溯链</div>
                  <div className="trace-timeline">
                    {traceInfo.sourceChain.map((item, idx) => (
                      <div key={idx} className="trace-item">
                        <div className="trace-type">{item.type}</div>
                        <div className="trace-detail">{item.detail}</div>
                        {item.time && <div className="trace-time">{item.time}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-title">📊 发育阶段定位</div>
                <div className="stage-bar" style={{ height: 40 }}>
                  {stages.map(s => (
                    <div
                      key={s.id}
                      className={`stage-block ${selectedRecord.stage === s.id ? 'active' : ''} ${selectedRecord.finalStage === s.id ? 'final' : ''}`}
                      title={`${s.name} (${s.hours}h)`}
                      style={{ position: 'relative' }}
                    >
                      {(selectedRecord.stage === s.id || selectedRecord.finalStage === s.id) && (
                        <div style={{
                          position: 'absolute',
                          bottom: -24,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: 10,
                          whiteSpace: 'nowrap',
                          color: '#475569',
                          background: '#fff',
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #e2e8f0'
                        }}>
                          {s.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="legend" style={{ marginTop: 28 }}>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#3b82f6' }}></div>
                    原始标注阶段
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot" style={{ background: '#10b981' }}></div>
                    复核最终结论
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👆</div>
              <div style={{ fontSize: 16, color: '#64748b' }}>从左侧选择一条记录开始复盘</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
                点击图片名可查看原图 · 查看来源追溯链 · 定位发育阶段
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
