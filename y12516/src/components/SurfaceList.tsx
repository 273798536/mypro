import { SurfaceModel } from '../types';

interface SurfaceListProps {
  surfaces: SurfaceModel[];
  selectedId: string;
  onSelect: (id: string) => void;
  onImport: () => void;
}

export function SurfaceList({ surfaces, selectedId, onSelect, onImport }: SurfaceListProps) {
  return (
    <div style={{
      width: '280px',
      background: '#0f3460',
      padding: '16px',
      overflowY: 'auto',
      borderRight: '1px solid #16213e'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#4ecdc4' }}>
          📚 曲面积分馆
        </h2>
        <button onClick={onImport} style={{
          padding: '6px 12px',
          background: '#4ecdc4',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          📂 导入
        </button>
      </div>

      {surfaces.map((surface) => {
        const latestVersion = surface.versions[surface.versions.length - 1];
        const hasAnomalies = latestVersion.anomalies.length > 0;
        const hasBoundaryIssue = latestVersion.anomalies.some(a => a.type === 'boundary_missing');

        return (
          <div
            key={surface.id}
            onClick={() => onSelect(surface.id)}
            style={{
              padding: '14px',
              marginBottom: '10px',
              background: selectedId === surface.id ? '#16213e' : '#1a1a2e',
              borderRadius: '8px',
              cursor: 'pointer',
              border: selectedId === surface.id ? '2px solid #4ecdc4' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {hasBoundaryIssue && <span style={{ color: '#ff6b6b' }}>◯</span>}
              {hasAnomalies && !hasBoundaryIssue && <span style={{ color: '#ffd93d' }}>⚠</span>}
              <span style={{ color: '#eaeaea', fontWeight: 'bold', fontSize: '14px' }}>
                {surface.name}
              </span>
            </div>
            <code style={{
              display: 'block',
              fontSize: '11px',
              color: '#a8e6cf',
              marginBottom: '8px',
              opacity: 0.8
            }}>
              {surface.equation}
            </code>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#666' }}>v{surface.currentVersion}</span>
              <span style={{ color: '#4ecdc4' }}>
                Φ = {latestVersion.fluxEstimate.toFixed(3)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <span style={{
                padding: '2px 8px',
                background: '#6bcb7730',
                color: '#6bcb77',
                borderRadius: '10px',
                fontSize: '10px'
              }}>
                {latestVersion.samplePoints.length} 采样点
              </span>
              {hasAnomalies && (
                <span style={{
                  padding: '2px 8px',
                  background: '#ff6b6b30',
                  color: '#ff6b6b',
                  borderRadius: '10px',
                  fontSize: '10px'
                }}>
                  {latestVersion.anomalies.length} 异常
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: '24px', padding: '12px', background: '#16213e', borderRadius: '8px', fontSize: '11px', color: '#888' }}>
        <div style={{ fontWeight: 'bold', color: '#4ecdc4', marginBottom: '8px' }}>📖 使用说明</div>
        <div>• 左侧选择曲面模型</div>
        <div>• 3D视图可拖拽旋转、滚轮缩放</div>
        <div>• 底部补录采样点查看影响</div>
        <div>• 右侧面板查看数值和异常</div>
      </div>
    </div>
  );
}
