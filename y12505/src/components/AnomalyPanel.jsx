import { useLatticeStore, ANOMALY_TYPES } from '../store/latticeStore'

export const AnomalyPanel = () => {
  const anomalies = useLatticeStore(state => state.anomalies)
  const setSelectedObject = useLatticeStore(state => state.setSelectedObject)

  const grouped = anomalies.reduce((acc, a) => {
    acc[a.type] = acc[a.type] || []
    acc[a.type].push(a)
    return acc
  }, {})

  return (
    <div className="panel">
      <h3 style={{ margin: '0 0 12px 0', color: '#60a5fa' }}>
        ⚠️ 异常检测 ({anomalies.length})
      </h3>

      {anomalies.length === 0 ? (
        <div style={{
          color: '#22c55e',
          fontSize: '12px',
          textAlign: 'center',
          padding: '20px 0'
        }}>
          ✓ 未检测到异常
        </div>
      ) : (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {Object.entries(ANOMALY_TYPES).map(([key, type]) => {
            const items = grouped[key] || []
            if (items.length === 0) return null
            return (
              <div key={key} style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: type.color,
                  marginBottom: '4px'
                }}>
                  {type.name} ({items.length})
                </div>
                {items.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '11px',
                      padding: '4px 6px',
                      background: `${type.color}15`,
                      borderRadius: '3px',
                      marginBottom: '3px',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${type.color}`
                    }}
                    onClick={() => setSelectedObject({ ...a, id: a.message, objectType: 'anomaly', anomalyType: type })}
                  >
                    {a.message}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
