import React, { useState, useEffect } from 'react'
import { api } from '../utils/api.js'
import { useNavigate } from 'react-router-dom'

export default function StatisticsPage() {
  const [stats, setStats] = useState(null)
  const [view, setView] = useState('stage')
  const [selectedStage, setSelectedStage] = useState(null)
  const [selectedSample, setSelectedSample] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadStats()
  }, [])

  function loadStats() {
    api.getStatistics().then(res => setStats(res))
  }

  function goToRecords(filter) {
    navigate('/?' + new URLSearchParams(filter).toString())
  }

  if (!stats) return <div>加载中...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 分组统计与结论汇总</h1>
        <p className="page-desc">按发育阶段和样本分组统计，结论可追溯回原始材料，导师能一眼分清哪些可直接用、哪些需复核。</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats.overall.total}</div>
          <div className="stat-label">总记录数</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.overall.approved}</div>
          <div className="stat-label">已通过（可直接用）</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.overall.pendingReview}</div>
          <div className="stat-label">待复核（需确认）</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{stats.overall.anomaly}</div>
          <div className="stat-label">异常记录</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📏</div>
          <div className="stat-value" style={{ color: '#8b5cf6' }}>{stats.overall.boundary}</div>
          <div className="stat-label">边界记录</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-value" style={{ color: '#6b7280' }}>{stats.overall.rejected}</div>
          <div className="stat-label">已驳回</div>
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <div className={`tab ${view === 'stage' ? 'active' : ''}`} onClick={() => setView('stage')}>
            按发育阶段统计
          </div>
          <div className={`tab ${view === 'sample' ? 'active' : ''}`} onClick={() => setView('sample')}>
            按样本分组统计
          </div>
        </div>

        {view === 'stage' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>发育阶段</th>
                  <th>时间范围</th>
                  <th>总数</th>
                  <th>已通过</th>
                  <th>待复核</th>
                  <th>异常数</th>
                  <th>通过率</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {stats.stageStats.filter(s => s.count > 0).map(s => {
                  const passRate = s.count > 0 ? ((s.approved / s.count) * 100).toFixed(1) : 0
                  return (
                    <tr key={s.stage}>
                      <td style={{ fontWeight: 500 }}>{s.stageName}</td>
                      <td style={{ color: '#64748b' }}>{s.hours || '-'}</td>
                      <td>{s.count}</td>
                      <td style={{ color: '#10b981' }}>{s.approved}</td>
                      <td style={{ color: '#f59e0b' }}>{s.pending}</td>
                      <td style={{ color: '#ef4444' }}>{s.anomaly}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, minWidth: 80 }}>
                            <div style={{ width: `${passRate}%`, height: '100%', background: passRate >= 80 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 3 }}></div>
                          </div>
                          <span style={{ fontSize: 12, color: '#64748b', minWidth: 45 }}>{passRate}%</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => goToRecords({ stage: s.stage })}>
                          查看记录
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === 'sample' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>样本名称</th>
                  <th>总数</th>
                  <th>已通过</th>
                  <th>待复核</th>
                  <th>异常数</th>
                  <th>结论状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {stats.sampleStats.map(s => {
                  const canUseDirectly = s.pendingReview === 0 && s.anomaly === 0
                  return (
                    <tr key={s.sampleName}>
                      <td style={{ fontWeight: 500 }}>{s.sampleName}</td>
                      <td>{s.total}</td>
                      <td style={{ color: '#10b981' }}>{s.approved}</td>
                      <td style={{ color: '#f59e0b' }}>{s.pendingReview}</td>
                      <td style={{ color: '#ef4444' }}>{s.anomaly}</td>
                      <td>
                        {canUseDirectly ? (
                          <span className="badge badge-success">✓ 可直接用</span>
                        ) : (
                          <span className="badge badge-warning">⏳ 需复核</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => goToRecords({ sampleName: s.sampleName })}>
                          查看明细
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">📌 结果分类说明</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: 600, color: '#065f46', marginBottom: 8 }}>✅ 可直接用的结论</div>
            <ul style={{ fontSize: 13, color: '#065f46', paddingLeft: 20, lineHeight: 1.8 }}>
              <li>复核状态为"已通过"的记录</li>
              <li>无异常标记，置信度较高</li>
              <li>非边界阶段，判定明确</li>
              <li>可直接用于统计分析和报告</li>
            </ul>
          </div>
          <div style={{ padding: 16, background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 8 }}>⏳ 需要找生态调查员复核的</div>
            <ul style={{ fontSize: 13, color: '#92400e', paddingLeft: 20, lineHeight: 1.8 }}>
              <li>复核状态为"待复核"的记录</li>
              <li>标记为异常的胚胎</li>
              <li>处于阶段边界的判定</li>
              <li>置信度低于 80% 的标注</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
