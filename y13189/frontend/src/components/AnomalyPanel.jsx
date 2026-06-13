function AnomalyPanel({ anomalies }) {
  const getTypeLabel = (type) => {
    switch (type) {
      case 'direction_error': return '方向错误'
      case 'unit_mismatch': return '单位不一致'
      case 'boundary_sample': return '边界样本'
      default: return type
    }
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: '20px 0' }}>
        暂无异常
      </div>
    )
  }

  return (
    <div className="anomaly-list">
      {anomalies.map((anomaly, index) => (
        <div key={index} className={`anomaly-item ${anomaly.severity}`}>
          <div className="anomaly-title">
            <span className={`badge ${anomaly.severity === 'high' ? 'danger' : anomaly.severity === 'medium' ? 'warning' : 'info'}`}>
              {getTypeLabel(anomaly.type)}
            </span>
            {' '}{anomaly.sampleName}
          </div>
          <div className="anomaly-desc">{anomaly.description}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#4a5568', fontWeight: 500 }}>
            处理结果：{anomaly.processingResult}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AnomalyPanel
