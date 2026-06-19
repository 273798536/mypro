import { useState } from 'react'
import { useReviewStore } from '../store'
import type { ReviewRecord, ReviewStatus, RecordType } from '../types'
import RecordDetail from './RecordDetail'

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  confirmed: '已确认',
  suspended: '已挂起',
  anomaly: '异常',
  supplemented: '补录',
}

const TYPE_LABEL: Record<RecordType, string> = {
  normal: '顺利',
  supplemented: '补录',
  anomaly: '异常',
}

export default function OperatorView() {
  const { records } = useReviewStore()
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null)
  const [filter, setFilter] = useState<'all' | ReviewStatus>('all')

  const filtered = filter === 'all' ? records : records.filter((r) => r.status === filter)
  const selected: ReviewRecord | undefined = records.find((r) => r.id === selectedId)

  const filterChips: Array<{ key: 'all' | ReviewStatus; label: string }> = [
    { key: 'all', label: `全部 (${records.length})` },
    { key: 'pending', label: `待处理 (${records.filter((r) => r.status === 'pending').length})` },
    { key: 'processing', label: `处理中 (${records.filter((r) => r.status === 'processing').length})` },
    { key: 'suspended', label: `已挂起 (${records.filter((r) => r.status === 'suspended').length})` },
    { key: 'supplemented', label: `补录 (${records.filter((r) => r.status === 'supplemented').length})` },
    { key: 'confirmed', label: `已确认 (${records.filter((r) => r.status === 'confirmed').length})` },
    { key: 'anomaly', label: `异常 (${records.filter((r) => r.status === 'anomaly').length})` },
  ]

  const deltaClass = (v: number) =>
    v > 0.0001 ? 'metric-up' : v < -0.0001 ? 'metric-down' : ''
  const deltaSign = (v: number) => (v > 0 ? '+' : '')

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">待排班处理</div>
          <div className="stat-value">
            {records.filter((r) => r.status === 'pending' || r.status === 'processing').length}
          </div>
          <div className="stat-sub">含处理中</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">阈值漂移挂起</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {records.filter((r) => r.status === 'suspended').length}
          </div>
          <div className="stat-sub">需人工确认，拒绝假稳定</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">补录记录</div>
          <div className="stat-value" style={{ color: '#7c3aed' }}>
            {records.filter((r) => r.recordType === 'supplemented').length}
          </div>
          <div className="stat-sub">含后补备注/旧截图</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">异常记录</div>
          <div className="stat-value" style={{ color: '#b91c1c' }}>
            {records.filter((r) => r.recordType === 'anomaly' || r.status === 'anomaly').length}
          </div>
          <div className="stat-sub">坏数据已隔离</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          📋 审查记录列表
          <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
            点击记录查看详情并进行人工改判
          </span>
        </div>

        <div className="filters">
          {filterChips.map((c) => (
            <button
              key={c.key}
              className={`filter-chip ${filter === c.key ? 'active' : ''}`}
              onClick={() => setFilter(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>暂无记录</h3>
            <p>当前筛选条件下没有审查记录</p>
          </div>
        ) : (
          <div className="record-list">
            {filtered.map((r) => {
              const delta = r.finalMetric - r.baselineMetric
              const rowClass =
                r.status === 'suspended'
                  ? 'record-row-suspended'
                  : r.status === 'anomaly' || r.recordType === 'anomaly'
                  ? 'record-row-anomaly'
                  : r.recordType === 'supplemented'
                  ? 'record-row-supplemented'
                  : ''
              return (
                <div
                  key={r.id}
                  className={`record-row ${selectedId === r.id ? 'selected' : ''} ${rowClass}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div>
                    <div className="cr-id">{r.codeReviewId}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                      <span className={`badge badge-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                      <span className="badge badge-supplemented">{TYPE_LABEL[r.recordType]}</span>
                    </div>
                  </div>
                  <div className="record-metric">
                    <div className="metric-item">
                      <span className="metric-label">基线</span>
                      <span className="metric-value">{r.baselineMetric.toFixed(4)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">算法产出</span>
                      <span className="metric-value">{r.algorithmMetric.toFixed(4)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">最终值</span>
                      <span className={`metric-value ${deltaClass(delta)}`}>
                        {r.finalMetric.toFixed(4)} ({deltaSign(delta)}
                        {delta.toFixed(4)})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="metric-label">负责人</div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{r.assignedTo}</div>
                  </div>
                  <div>
                    <div className="metric-label">更新时间</div>
                    <div className="record-time">
                      {new Date(r.updatedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {r.status === 'suspended' && (
                      <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
                        ⚠ 待确认
                      </span>
                    )}
                    {r.history.length > 0 && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                        {r.history.length} 条历史
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="two-col">
        <div />
        <div className="detail-panel">
          {selected ? (
            <RecordDetail record={selected} />
          ) : (
            <div className="card">
              <div className="empty-state">
                <h3>请选择一条记录</h3>
                <p>从左侧列表中选择一条审查记录查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
