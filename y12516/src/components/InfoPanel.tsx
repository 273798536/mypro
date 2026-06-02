import { SurfaceModel, AnomalyRecord } from '../types';

interface InfoPanelProps {
  surface: SurfaceModel;
  onExport: () => void;
}

export function InfoPanel({ surface, onExport }: InfoPanelProps) {
  const latestVersion = surface.versions[surface.versions.length - 1];

  const getAnomalyColor = (severity: AnomalyRecord['severity']) => {
    return severity === 'error' ? '#ff6b6b' : '#ffd93d';
  };

  const getAnomalyIcon = (type: AnomalyRecord['type']) => {
    switch (type) {
      case 'normal_reversed': return '⟳';
      case 'insufficient_samples': return '⚠';
      case 'boundary_missing': return '◯';
      case 'parameter_sensitive': return '⚙';
      default: return '?';
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#16213e', 
      height: '100%', 
      overflowY: 'auto',
      color: '#eaeaea'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#4ecdc4' }}>
          {surface.name}
        </h2>
        <code style={{ 
          display: 'block', 
          background: '#0f3460', 
          padding: '8px 12px', 
          borderRadius: '4px',
          fontSize: '14px',
          color: '#a8e6cf'
        }}>
          {surface.equation}
        </code>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#4ecdc4' }}>
          📊 通量估算
        </h3>
        <div style={{ 
          background: '#0f3460', 
          padding: '16px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4ecdc4' }}>
            {latestVersion.fluxEstimate.toFixed(4)}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            版本 v{surface.currentVersion}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#4ecdc4' }}>
          📍 采样点 ({latestVersion.samplePoints.length})
        </h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {latestVersion.samplePoints.map((point, idx) => (
            <div key={point.id} style={{
              padding: '8px 12px',
              marginBottom: '4px',
              background: point.source === 'supplementary' ? '#3d2c0a' : '#0f3460',
              borderRadius: '4px',
              fontSize: '12px',
              borderLeft: `3px solid ${point.isBoundary ? '#ff6b6b' : '#6bcb77'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>#{idx + 1} ({point.position.x.toFixed(2)}, {point.position.y.toFixed(2)})</span>
                <span style={{ color: '#a8e6cf' }}>{point.fluxValue.toFixed(3)}</span>
              </div>
              {point.source === 'supplementary' && (
                <div style={{ color: '#ffd93d', fontSize: '10px', marginTop: '2px' }}>
                  ⚡ 补录点
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {latestVersion.anomalies.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#ff6b6b' }}>
            ⚠ 异常检测 ({latestVersion.anomalies.length})
          </h3>
          {latestVersion.anomalies.map((anomaly) => (
            <div key={anomaly.id} style={{
              padding: '12px',
              marginBottom: '8px',
              background: getAnomalyColor(anomaly.severity) + '20',
              borderRadius: '8px',
              border: `1px solid ${getAnomalyColor(anomaly.severity)}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{getAnomalyIcon(anomaly.type)}</span>
                <span style={{ fontWeight: 'bold', color: getAnomalyColor(anomaly.severity) }}>
                  {anomaly.type === 'boundary_missing' && '边界漏算'}
                  {anomaly.type === 'normal_reversed' && '法向反向'}
                  {anomaly.type === 'insufficient_samples' && '采样过少'}
                </span>
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#ccc' }}>
                {anomaly.description}
              </div>
              {anomaly.evidence.before !== undefined && (
                <div style={{ fontSize: '11px', marginTop: '6px', color: '#888' }}>
                  证据: {anomaly.evidence.before} → {anomaly.evidence.after?.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#4ecdc4' }}>
          📜 版本历史
        </h3>
        {surface.versions.slice().reverse().map((v) => (
          <div key={v.id} style={{
            padding: '8px 12px',
            marginBottom: '4px',
            background: v.version === surface.currentVersion ? '#4ecdc420' : '#0f3460',
            borderRadius: '4px',
            fontSize: '12px',
            border: v.version === surface.currentVersion ? '1px solid #4ecdc4' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: v.version === surface.currentVersion ? 'bold' : 'normal' }}>
                v{v.version}
              </span>
              <span style={{ color: '#a8e6cf' }}>{v.fluxEstimate.toFixed(4)}</span>
            </div>
            <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
              {new Date(v.createdAt).toLocaleString()}
            </div>
            {v.notes && (
              <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>
                {v.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={onExport} style={{
          flex: 1,
          padding: '10px',
          background: '#4ecdc4',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          📸 截图导出
        </button>
      </div>
    </div>
  );
}
