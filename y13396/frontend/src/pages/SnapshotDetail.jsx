import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

function SnapshotDetail() {
  const { id } = useParams()
  const [snapshot, setSnapshot] = useState(null)
  const [version, setVersion] = useState(null)
  const [impact, setImpact] = useState(null)
  const [editNotes, setEditNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSnapshotData()
  }, [id])

  const fetchSnapshotData = async () => {
    setLoading(true)
    try {
      const [snapshotRes, impactRes] = await Promise.all([
        fetch(`/api/snapshots/${id}`),
        fetch(`/api/snapshots/${id}/impact`)
      ])

      const snapshotData = await snapshotRes.json()
      const impactData = await impactRes.json()

      if (snapshotData.code === 0) {
        setSnapshot(snapshotData.data)
        setEditNotes(snapshotData.data.notes || '')
        
        const versionRes = await fetch(`/api/versions/${snapshotData.data.version_id}`)
        const versionData = await versionRes.json()
        if (versionData.code === 0) setVersion(versionData.data)
      }
      if (impactData.code === 0) setImpact(impactData.data)
    } catch (err) {
      console.error('获取快照详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      const res = await fetch(`/api/snapshots/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: editNotes })
      })
      const data = await res.json()
      if (data.code === 0) {
        setSnapshot(data.data)
        fetchSnapshotData()
      }
    } catch (err) {
      console.error('更新状态失败:', err)
    }
  }

  const getStatusText = (status) => {
    const map = {
      pending: '待处理',
      confirmed: '已确认',
      rejected: '已拒绝',
      needs_evidence: '待补证据'
    }
    return map[status] || status
  }

  const getAnomalyText = (type) => {
    const map = {
      none: '无异常',
      name_mismatch: '名称不一致',
      duplicate_run_id: 'run_id重复'
    }
    return map[type] || type
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!snapshot) {
    return <div className="empty">快照不存在</div>
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">版本列表</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to={`/version/${snapshot.version_id}`}>
          {version?.version_name || '版本详情'}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{snapshot.name}</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{snapshot.name}</h1>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className={`status-badge status-${snapshot.status}`}>
                {getStatusText(snapshot.status)}
              </span>
              {snapshot.anomaly_type !== 'none' && (
                <span className="status-badge status-pending_confirmation">
                  ⚠️ {getAnomalyText(snapshot.anomaly_type)}
                </span>
              )}
            </div>
          </div>
        </div>

        {snapshot.anomaly_type !== 'none' && (
          <div className="alert alert-danger" style={{ marginTop: 16 }}>
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <div className="alert-title">异常提醒</div>
              <div>{snapshot.anomaly_detail}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">基本信息</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">快照ID</span>
            <span className="detail-value" style={{ fontFamily: 'monospace' }}>{snapshot.id}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">运行ID</span>
            <span className="detail-value" style={{ fontFamily: 'monospace' }}>{snapshot.run_id}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">快照名称</span>
            <span className="detail-value">{snapshot.name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">预期名称</span>
            <span className="detail-value">
              {snapshot.expected_name}
              {snapshot.name !== snapshot.expected_name && (
                <span style={{ color: '#f56c6c', marginLeft: 8, fontSize: '12px' }}>不一致</span>
              )}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">创建时间</span>
            <span className="detail-value">{new Date(snapshot.created_at).toLocaleString('zh-CN')}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">更新时间</span>
            <span className="detail-value">{new Date(snapshot.updated_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">特征指标</h3>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-label">QPS</div>
            <div className="feature-value">{snapshot.features?.qps || '-'}</div>
          </div>
          <div className="feature-item">
            <div className="feature-label">平均延迟</div>
            <div className="feature-value">{snapshot.features?.avg_latency || '-'} ms</div>
          </div>
          <div className="feature-item">
            <div className="feature-label">错误率</div>
            <div className="feature-value">{snapshot.features?.error_rate || '-'}</div>
          </div>
          <div className="feature-item">
            <div className="feature-label">P99延迟</div>
            <div className="feature-value">{snapshot.features?.p99_latency || '-'} ms</div>
          </div>
          <div className="feature-item" style={{ background: '#ecf5ff', gridColumn: '1 / -1' }}>
            <div className="feature-label">综合指标分数</div>
            <div className="feature-value" style={{ fontSize: '32px', color: '#409eff' }}>
              {snapshot.metric_score}
            </div>
          </div>
        </div>
      </div>

      {impact && (
        <div className="card">
          <h3 className="section-title">版本影响分析</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">所属版本综合指标</span>
              <span className="detail-value">{impact.version_overall}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">偏离均值</span>
              <span className={`detail-value ${impact.deviation_from_avg > 0 ? 'deviation-positive' : 'deviation-negative'}`}>
                {impact.deviation_from_avg > 0 ? '+' : ''}{impact.deviation_from_avg.toFixed(2)}
                ({impact.deviation_percent}%)
              </span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">是否为高影响样本</span>
              <span className="detail-value">
                {impact.is_influential ? (
                  <span className="status-badge status-pending" style={{ fontSize: '14px' }}>
                    是 - 可能拉偏结论
                  </span>
                ) : (
                  <span className="status-badge status-confirmed" style={{ fontSize: '14px' }}>
                    否 - 在正常范围内
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="section-title">状态处理</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: '13px', color: '#606266' }}>
            备注说明
          </label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="输入处理备注或补充证据说明..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #dcdfe6',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div className="action-buttons">
          <button 
            className="btn btn-success" 
            onClick={() => handleStatusUpdate('confirmed')}
            disabled={snapshot.status === 'confirmed'}
          >
            ✓ 确认通过
          </button>
          <button 
            className="btn btn-warning" 
            onClick={() => handleStatusUpdate('needs_evidence')}
            disabled={snapshot.status === 'needs_evidence'}
          >
            📝 待补证据
          </button>
          <button 
            className="btn btn-danger" 
            onClick={() => handleStatusUpdate('rejected')}
            disabled={snapshot.status === 'rejected'}
          >
            ✗ 拒绝
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleStatusUpdate('pending')}
            disabled={snapshot.status === 'pending'}
          >
            ↩ 重置为待处理
          </button>
        </div>
      </div>

      <div className="alert alert-info">
        <span className="alert-icon">💡</span>
        <div className="alert-content">
          <div className="alert-title">操作说明</div>
          <div>
            <strong>确认通过：</strong>数据有效，计入版本统计<br/>
            <strong>待补证据：</strong>数据存疑，需要补充更多证据后再确认<br/>
            <strong>拒绝：</strong>数据无效，不计入版本统计<br/>
            <strong>导出CSV：</strong>请在版本详情页点击导出按钮，确保与接口查询状态一致
          </div>
        </div>
      </div>
    </div>
  )
}

export default SnapshotDetail
