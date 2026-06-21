import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function VersionList() {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    try {
      const res = await fetch('/api/versions')
      const data = await res.json()
      if (data.code === 0) {
        setVersions(data.data)
      }
    } catch (err) {
      console.error('获取版本列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status) => {
    const map = {
      processing: '处理中',
      pending_confirmation: '待确认',
      pending_review: '待评审',
      completed: '已完成',
      needs_evidence: '待补证据'
    }
    return map[status] || status
  }

  const getProgressPercent = (version) => {
    if (version.total_count === 0) return 0
    return Math.round(((version.confirmed_count || 0) + (version.rejected_count || 0)) / version.total_count * 100)
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="page-title" style={{ marginBottom: 0 }}>影子流量版本快照</h2>
          <Link to="/" className="btn btn-primary">
            + 新建版本
          </Link>
        </div>
        <p className="page-subtitle">
          查看所有版本快照的处理进度，点击版本名称查看明细和异常项
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">总版本数</div>
          <div className="stat-value">{versions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待确认</div>
          <div className="stat-value danger">
            {versions.filter(v => v.status === 'pending_confirmation').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待补证据</div>
          <div className="stat-value warning">
            {versions.filter(v => v.status === 'needs_evidence').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已完成</div>
          <div className="stat-value success">
            {versions.filter(v => v.status === 'completed').length}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">版本列表</h3>
        <table>
          <thead>
            <tr>
              <th>版本名称</th>
              <th>状态</th>
              <th>样本总数</th>
              <th>已确认</th>
              <th>异常项</th>
              <th>待补证据</th>
              <th>综合指标</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {versions.map(version => (
              <tr key={version.id}>
                <td>
                  <Link to={`/version/${version.id}`} style={{ color: '#409eff', textDecoration: 'none' }}>
                    {version.version_name}
                  </Link>
                </td>
                <td>
                  <span className={`status-badge status-${version.status}`}>
                    {getStatusText(version.status)}
                  </span>
                </td>
                <td>{version.total_count}</td>
                <td>{version.confirmed_count}</td>
                <td>
                  {version.anomaly_count > 0 ? (
                    <span style={{ color: '#f56c6c', fontWeight: 600 }}>
                      {version.anomaly_count}
                    </span>
                  ) : (
                    <span style={{ color: '#67c23a' }}>0</span>
                  )}
                </td>
                <td>
                  {version.needs_evidence_count > 0 ? (
                    <span style={{ color: '#e6a23c', fontWeight: 600 }}>
                      {version.needs_evidence_count}
                    </span>
                  ) : (
                    <span style={{ color: '#67c23a' }}>0</span>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{version.overall_metric}</span>
                </td>
                <td style={{ fontSize: '12px', color: '#909399' }}>
                  {new Date(version.created_at).toLocaleString('zh-CN')}
                </td>
                <td>
                  <Link to={`/version/${version.id}`} className="btn btn-secondary btn-small">
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="alert alert-info">
        <span className="alert-icon">💡</span>
        <div className="alert-content">
          <div className="alert-title">快速入口说明</div>
          <div>点击版本名称进入详情页，可查看特征快照明细、异常项、样本影响分析，并支持导出CSV。</div>
        </div>
      </div>
    </div>
  )
}

export default VersionList
