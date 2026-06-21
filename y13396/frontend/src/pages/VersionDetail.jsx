import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

function VersionDetail() {
  const { id } = useParams()
  const [version, setVersion] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [anomalies, setAnomalies] = useState(null)
  const [influentialSamples, setInfluentialSamples] = useState(null)
  const [activeTab, setActiveTab] = useState('snapshots')
  const [statusFilter, setStatusFilter] = useState('all')
  const [anomalyFilter, setAnomalyFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVersionData()
  }, [id])

  const fetchVersionData = async () => {
    setLoading(true)
    try {
      const [versionRes, snapshotsRes, anomaliesRes, influentialRes] = await Promise.all([
        fetch(`/api/versions/${id}`),
        fetch(`/api/snapshots?version_id=${id}`),
        fetch(`/api/versions/${id}/anomalies`),
        fetch(`/api/versions/${id}/influential-samples`)
      ])

      const versionData = await versionRes.json()
      const snapshotsData = await snapshotsRes.json()
      const anomaliesData = await anomaliesRes.json()
      const influentialData = await influentialRes.json()

      if (versionData.code === 0) setVersion(versionData.data)
      if (snapshotsData.code === 0) setSnapshots(snapshotsData.data)
      if (anomaliesData.code === 0) setAnomalies(anomaliesData.data)
      if (influentialData.code === 0) setInfluentialSamples(influentialData.data)
    } catch (err) {
      console.error('获取版本详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    window.location.href = `/api/csv/version/${id}`
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

  const filteredSnapshots = snapshots.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (anomalyFilter !== 'all' && s.anomaly_type !== anomalyFilter) return false
    return true
  })

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!version) {
    return <div className="empty">版本不存在</div>
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">版本列表</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{version.version_name}</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{version.version_name}</h1>
            <span className={`status-badge status-${version.status}`}>
              {getStatusText(version.status)}
            </span>
          </div>
          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              📊 导出CSV
            </button>
          </div>
        </div>

        {version.notes && (
          <div className="notes-text">
            <strong>备注：</strong>{version.notes}
          </div>
        )}
      </div>

      {anomalies && anomalies.summary.total_anomalies > 0 && (
        <div className="alert alert-danger">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <div className="alert-title">
              检测到 {anomalies.summary.total_anomalies} 项异常，版本进入待确认状态
            </div>
            <div>{anomalies.reason}</div>
            <div style={{ marginTop: 8, fontSize: '13px' }}>
              <strong>影响范围：</strong>
              影响 {anomalies.summary.impact_scope.affected_snapshots} 条快照，
              涉及 {anomalies.summary.impact_scope.affected_run_ids} 个运行ID
            </div>
            <div style={{ marginTop: 4, fontSize: '13px' }}>
              <strong>建议：</strong>{anomalies.suggestion}
            </div>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">样本总数</div>
          <div className="stat-value">{version.total_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已确认</div>
          <div className="stat-value success">{version.confirmed_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">异常项</div>
          <div className="stat-value danger">{version.anomaly_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待补证据</div>
          <div className="stat-value warning">{version.needs_evidence_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">综合指标</div>
          <div className="stat-value">{version.overall_metric}</div>
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <div 
            className={`tab-item ${activeTab === 'snapshots' ? 'active' : ''}`}
            onClick={() => setActiveTab('snapshots')}
          >
            特征快照明细
          </div>
          <div 
            className={`tab-item ${activeTab === 'anomalies' ? 'active' : ''}`}
            onClick={() => setActiveTab('anomalies')}
          >
            异常项 ({anomalies?.summary?.total_anomalies || 0})
          </div>
          <div 
            className={`tab-item ${activeTab === 'influential' ? 'active' : ''}`}
            onClick={() => setActiveTab('influential')}
          >
            样本影响分析
          </div>
        </div>

        {activeTab === 'snapshots' && (
          <div>
            <div className="filter-bar">
              <div className="filter-item">
                <label>状态：</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">全部</option>
                  <option value="pending">待处理</option>
                  <option value="confirmed">已确认</option>
                  <option value="needs_evidence">待补证据</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
              <div className="filter-item">
                <label>异常类型：</label>
                <select value={anomalyFilter} onChange={(e) => setAnomalyFilter(e.target.value)}>
                  <option value="all">全部</option>
                  <option value="none">无异常</option>
                  <option value="name_mismatch">名称不一致</option>
                  <option value="duplicate_run_id">run_id重复</option>
                </select>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>快照名称</th>
                  <th>运行ID</th>
                  <th>状态</th>
                  <th>异常类型</th>
                  <th>指标分数</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSnapshots.map(snapshot => (
                  <tr key={snapshot.id}>
                    <td>
                      <Link to={`/snapshot/${snapshot.id}`} style={{ color: '#409eff', textDecoration: 'none' }}>
                        {snapshot.name}
                      </Link>
                      {snapshot.anomaly_type === 'name_mismatch' && (
                        <span style={{ color: '#f56c6c', fontSize: '12px', marginLeft: 8 }}>
                          (预期: {snapshot.expected_name})
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{snapshot.run_id}</td>
                    <td>
                      <span className={`status-badge status-${snapshot.status}`}>
                        {getStatusText(snapshot.status)}
                      </span>
                    </td>
                    <td>
                      {snapshot.anomaly_type !== 'none' ? (
                        <span style={{ color: '#f56c6c' }}>
                          {getAnomalyText(snapshot.anomaly_type)}
                        </span>
                      ) : (
                        <span style={{ color: '#67c23a' }}>正常</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{snapshot.metric_score}</td>
                    <td style={{ fontSize: '12px', color: '#909399' }}>
                      {new Date(snapshot.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td>
                      <Link to={`/snapshot/${snapshot.id}`} className="btn btn-secondary btn-small">
                        查看
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'anomalies' && anomalies && (
          <div>
            {anomalies.anomalies.length === 0 ? (
              <div className="empty">暂无异常项</div>
            ) : (
              anomalies.anomalies.map((anomaly, index) => (
                <div key={index} className="anomaly-item">
                  <div className="anomaly-header">
                    <span className="anomaly-type">
                      {anomaly.type === 'name_mismatch' ? '❌ 名称不一致' : '🔁 run_id重复'}
                    </span>
                    {anomaly.run_id && (
                      <span style={{ fontSize: '12px', color: '#909399' }}>
                        运行ID: {anomaly.run_id}
                      </span>
                    )}
                  </div>
                  {anomaly.name && (
                    <div style={{ marginBottom: 6, fontSize: '14px' }}>
                      <strong>当前名称：</strong>{anomaly.name}
                      <span style={{ margin: '0 8px', color: '#c0c4cc' }}>|</span>
                      <strong>预期名称：</strong>{anomaly.expected_name}
                    </div>
                  )}
                  {anomaly.count && (
                    <div style={{ marginBottom: 6, fontSize: '14px' }}>
                      <strong>重复次数：</strong>{anomaly.count} 次
                      <span style={{ margin: '0 8px', color: '#c0c4cc' }}>|</span>
                      <strong>关联快照：</strong>
                      {anomaly.snapshot_ids?.map((id, i) => (
                        <span key={id}>
                          <Link to={`/snapshot/${id}`} style={{ color: '#409eff' }}>{id}</Link>
                          {i < anomaly.snapshot_ids.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '13px', color: '#606266' }}>
                    {anomaly.detail}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'influential' && influentialSamples && (
          <div>
            <div className="alert alert-warning">
              <span className="alert-icon">📊</span>
              <div className="alert-content">
                <div className="alert-title">样本影响分析</div>
                <div>
                  以下样本的指标分数偏离均值较大（偏离超过20%），
                  可能对综合结论产生显著影响。评审时建议重点关注这些样本。
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16, fontSize: '14px' }}>
              <strong>综合指标均值：</strong>
              <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: 8 }}>
                {influentialSamples.overall_metric}
              </span>
              <span style={{ marginLeft: 16 }}>
                <strong>高影响样本数：</strong>{influentialSamples.total_influential}
              </span>
            </div>

            {influentialSamples.samples.length === 0 ? (
              <div className="empty">暂无高影响样本</div>
            ) : (
              influentialSamples.samples.map(sample => (
                <div key={sample.id} className="influential-item">
                  <div className="influential-header">
                    <Link to={`/snapshot/${sample.id}`} style={{ color: '#409eff', fontWeight: 600, textDecoration: 'none' }}>
                      {sample.name}
                    </Link>
                    <span className={`deviation-${sample.deviation_from_avg >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                      {sample.deviation_from_avg >= 0 ? '↑' : '↓'} {Math.abs(sample.deviation_percent)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#606266' }}>
                    指标分数: {sample.metric_score}
                    <span style={{ margin: '0 8px', color: '#c0c4cc' }}>|</span>
                    偏离均值: {sample.deviation_from_avg > 0 ? '+' : ''}{sample.deviation_from_avg}
                    <span style={{ margin: '0 8px', color: '#c0c4cc' }}>|</span>
                    运行ID: {sample.run_id}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default VersionDetail
