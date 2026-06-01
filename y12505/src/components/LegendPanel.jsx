import { useLatticeStore, DEFECT_TYPES, ANOMALY_TYPES } from '../store/latticeStore'

export const LegendPanel = () => {
  const viewMode = useLatticeStore(state => state.viewMode)
  const setViewMode = useLatticeStore(state => state.setViewMode)
  const stressRange = useLatticeStore(state => state.stressRange)

  return (
    <div className="panel">
      <h3 style={{ margin: '0 0 12px 0', color: '#60a5fa' }}>🎨 视图控制</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
          显示模式
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('lattice')}
            className={`btn ${viewMode === 'lattice' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '11px' }}
          >
            晶格
          </button>
          <button
            onClick={() => setViewMode('stress')}
            className={`btn ${viewMode === 'stress' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '11px' }}
          >
            应力
          </button>
        </div>
      </div>

      {viewMode === 'stress' && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
            应力色阶
          </div>
          <div style={{
            height: '16px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)'
          }} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#6b7280',
            marginTop: '2px'
          }}>
            <span>{stressRange.min}</span>
            <span>应力值</span>
            <span>{stressRange.max}</span>
          </div>
        </div>
      )}

      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '10px',
        marginBottom: '10px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
          缺陷类型
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {Object.values(DEFECT_TYPES).map(type => (
            <div key={type.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: type.color
              }} />
              <span style={{ color: '#4b5563' }}>{type.icon} {type.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '10px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
          异常类型
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.values(ANOMALY_TYPES).map(type => (
            <div key={type.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: `2px solid ${type.color}`
              }} />
              <span style={{ color: '#4b5563' }}>{type.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
