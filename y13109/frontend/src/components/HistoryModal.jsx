export default function HistoryModal({ record, onClose }) {
  const sourceMap = {
    auto_calc: { text: '自动计算', color: '#1890ff' },
    manual_override: { text: '人工改判', color: '#faad14' },
    threshold_change: { text: '阈值调整', color: '#722ed1' },
    unit_change: { text: '单位变更', color: '#13c2c2' },
    late_attachment: { text: '晚到附件', color: '#eb2f96' },
    gray_release: { text: '灰度发布', color: '#fa8c16' }
  }

  const statusMap = {
    pending: '待计算',
    normal: '正常',
    empty: '空集合',
    singular: '奇异矩阵',
    out_of_bound: '越界',
    overridden: '人工改判',
    error: '错误'
  }

  const formatTime = (timeStr) => {
    return new Date(timeStr).toLocaleString('zh-CN')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: '500px' }}>
        <div className="modal-header">
          <h3>状态变更历史 - {record.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {record.status_history.length === 0 ? (
          <div className="empty-state">暂无变更记录</div>
        ) : (
          <div className="timeline">
            {[...record.status_history].reverse().map((change, idx) => {
              const source = sourceMap[change.source] || { text: change.source, color: '#999' }
              return (
                <div key={change.id} className="timeline-item">
                  <div className="timeline-time">{formatTime(change.timestamp)}</div>
                  <div className="timeline-content">
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#f0f0f0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginRight: '8px'
                      }}>
                        {statusMap[change.from_status] || change.from_status}
                      </span>
                      <span style={{ color: '#999' }}>→</span>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#e6f7ff',
                        color: '#1890ff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginLeft: '8px'
                      }}>
                        {statusMap[change.to_status] || change.to_status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      来源：<span style={{ color: source.color }}>{source.text}</span>
                      {change.operator && ` · 操作人：${change.operator}`}
                    </div>
                    {change.reason && (
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                        原因：{change.reason}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
