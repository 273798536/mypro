import { useLatticeStore, DEFECT_TYPES, ANOMALY_TYPES } from '../store/latticeStore'
import { formatNumber } from '../utils/colorMapping'

export const DetailPanel = () => {
  const selectedObject = useLatticeStore(state => state.selectedObject)
  const setSelectedObject = useLatticeStore(state => state.setSelectedObject)
  const anomalies = useLatticeStore(state => state.anomalies)
  const nodes = useLatticeStore(state => state.nodes)

  if (!selectedObject) {
    return (
      <div className="panel">
        <h3 style={{ margin: '0 0 12px 0', color: '#60a5fa' }}>📌 对象详情</h3>
        <div style={{
          color: '#9ca3af',
          fontSize: '12px',
          textAlign: 'center',
          padding: '20px 0'
        }}>
          点击晶格中的节点、缺陷或异常标记<br />查看详细信息
        </div>
      </div>
    )
  }

  const relatedAnomalies = anomalies.filter(a =>
    a.involvedIds?.includes(selectedObject.id)
  )

  const renderNodeDetails = () => (
    <>
      <div className="detail-row">
        <span className="detail-label">节点ID</span>
        <span className="detail-value">{selectedObject.id}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">位置</span>
        <span className="detail-value">
          ({formatNumber(selectedObject.position.x)},
          {formatNumber(selectedObject.position.y)},
          {formatNumber(selectedObject.position.z)})
        </span>
      </div>
      {selectedObject.stress && (
        <>
          <div className="detail-section">
            <span>📊 应力张量</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">σ_xx</span>
            <span className="detail-value">{formatNumber(selectedObject.stress.xx)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">σ_yy</span>
            <span className="detail-value">{formatNumber(selectedObject.stress.yy)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">σ_zz</span>
            <span className="detail-value">{formatNumber(selectedObject.stress.zz)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">τ_xy</span>
            <span className="detail-value">{formatNumber(selectedObject.stress.xy)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">τ_yz</span>
            <span className="detail-value">{formatNumber(selectedObject.stress.yz)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">τ_xz</span>
            <span className="detail-value">{formatNumber(selectedObject.stress.xz)}</span>
          </div>
          <div className="detail-row" style={{
            background: selectedObject.stressMagnitude > 1000 ? '#fef2f2' : 'transparent',
            margin: '4px -8px',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            <span className="detail-label" style={{ fontWeight: 'bold' }}>应力大小</span>
            <span className="detail-value" style={{
              fontWeight: 'bold',
              color: selectedObject.stressMagnitude > 1000 ? '#dc2626' : 'inherit'
            }}>
              {formatNumber(selectedObject.stressMagnitude)}
              {selectedObject.stressMagnitude > 1000 && ' ⚠️'}
            </span>
          </div>
        </>
      )}
    </>
  )

  const renderDefectDetails = () => (
    <>
      <div className="detail-row">
        <span className="detail-label">缺陷ID</span>
        <span className="detail-value">{selectedObject.id}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">缺陷类型</span>
        <span className="detail-value" style={{
          color: selectedObject.defectType?.color,
          fontWeight: 'bold'
        }}>
          {selectedObject.defectType?.icon} {selectedObject.defectType?.name || selectedObject.type}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">位置</span>
        <span className="detail-value">
          ({formatNumber(selectedObject.position.x)},
          {formatNumber(selectedObject.position.y)},
          {formatNumber(selectedObject.position.z)})
        </span>
      </div>
      {selectedObject.description && (
        <div className="detail-row">
          <span className="detail-label">描述</span>
          <span className="detail-value" style={{ fontSize: '11px' }}>
            {selectedObject.description}
          </span>
        </div>
      )}
      <div className="detail-row">
        <span className="detail-label">来源晶格</span>
        <span className="detail-value">
          {nodes.filter(n => {
            const dist = Math.sqrt(
              Math.pow(n.position.x - selectedObject.position.x, 2) +
              Math.pow(n.position.y - selectedObject.position.y, 2) +
              Math.pow(n.position.z - selectedObject.position.z, 2)
            )
            return dist < 1.5
          }).length} 个相邻节点
        </span>
      </div>
    </>
  )

  const renderAnomalyDetails = () => (
    <>
      <div className="detail-row">
        <span className="detail-label">异常类型</span>
        <span className="detail-value" style={{
          color: selectedObject.anomalyType?.color,
          fontWeight: 'bold'
        }}>
          ⚠️ {selectedObject.anomalyType?.name || selectedObject.type}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">严重程度</span>
        <span className="detail-value" style={{
          color: selectedObject.anomalyType?.severity === 'critical' ? '#dc2626' :
                 selectedObject.anomalyType?.severity === 'error' ? '#ef4444' : '#f59e0b',
          fontWeight: 'bold'
        }}>
          {selectedObject.anomalyType?.severity === 'critical' ? '🔴 严重' :
           selectedObject.anomalyType?.severity === 'error' ? '🟠 错误' : '🟡 警告'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">位置</span>
        <span className="detail-value">
          ({formatNumber(selectedObject.position.x)},
          {formatNumber(selectedObject.position.y)},
          {formatNumber(selectedObject.position.z)})
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">涉及对象</span>
        <span className="detail-value" style={{ fontSize: '11px' }}>
          {selectedObject.involvedIds?.join(', ') || '-'}
        </span>
      </div>
      {selectedObject.stressMagnitude && (
        <div className="detail-row">
          <span className="detail-label">应力值</span>
          <span className="detail-value" style={{ color: '#dc2626', fontWeight: 'bold' }}>
            {formatNumber(selectedObject.stressMagnitude)}
          </span>
        </div>
      )}
      <div className="detail-row">
        <span className="detail-label">提示</span>
        <span className="detail-value" style={{ fontSize: '11px', color: '#6b7280' }}>
          {selectedObject.message}
        </span>
      </div>
    </>
  )

  return (
    <div className="panel">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{ margin: 0, color: '#60a5fa' }}>
          {selectedObject.objectType === 'node' && '🔵 晶格节点'}
          {selectedObject.objectType === 'defect' && '💎 缺陷'}
          {selectedObject.objectType === 'anomaly' && '⚠️ 异常'}
        </h3>
        <button
          onClick={() => setSelectedObject(null)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#9ca3af'
          }}
        >
          ✕
        </button>
      </div>

      {selectedObject.objectType === 'node' && renderNodeDetails()}
      {selectedObject.objectType === 'defect' && renderDefectDetails()}
      {selectedObject.objectType === 'anomaly' && renderAnomalyDetails()}

      {relatedAnomalies.length > 0 && (
        <>
          <div style={{
            borderTop: '1px solid #e5e7eb',
            marginTop: '12px',
            paddingTop: '12px'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>
              🔗 相关异常 ({relatedAnomalies.length})
            </div>
            {relatedAnomalies.map((a, i) => (
              <div key={i} style={{
                fontSize: '11px',
                padding: '6px',
                background: '#fffbeb',
                borderRadius: '4px',
                marginBottom: '4px',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedObject({ ...a, id: a.message, objectType: 'anomaly', anomalyType: ANOMALY_TYPES[a.type] })}
              >
                <span style={{ color: ANOMALY_TYPES[a.type]?.color }}>⚠️</span>
                {' '}{a.message}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
