import { useState } from 'react';
import { SamplePoint } from '../types';

interface SupplementPanelProps {
  onAddSample: (sample: Omit<SamplePoint, 'id'>) => void;
  affectedSurfaces: Array<{
    name: string;
    fluxChange: number;
    changeType: string;
  }>;
}

export function SupplementPanel({ onAddSample, affectedSurfaces }: SupplementPanelProps) {
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [z, setZ] = useState('');
  const [fluxValue, setFluxValue] = useState('');
  const [isBoundary, setIsBoundary] = useState(false);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!x || !y || !z || !fluxValue) return;
    onAddSample({
      position: { x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) },
      fluxValue: parseFloat(fluxValue),
      measuredAt: new Date().toISOString(),
      isBoundary,
      source: 'supplementary',
      supplementaryNote: note
    });
    setX('');
    setY('');
    setZ('');
    setFluxValue('');
    setIsBoundary(false);
    setNote('');
  };

  return (
    <div style={{
      background: '#16213e',
      padding: '20px',
      borderTop: '1px solid #0f3460',
      color: '#eaeaea'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffd93d' }}>
        ⚡ 采样点补录
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 100px 1fr auto', gap: '12px', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>X</label>
          <input
            type="number"
            step="0.1"
            value={x}
            onChange={(e) => setX(e.target.value)}
            placeholder="-2.0"
            style={{
              width: '100%',
              padding: '8px',
              background: '#0f3460',
              border: '1px solid #4ecdc4',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Y</label>
          <input
            type="number"
            step="0.1"
            value={y}
            onChange={(e) => setY(e.target.value)}
            placeholder="1.5"
            style={{
              width: '100%',
              padding: '8px',
              background: '#0f3460',
              border: '1px solid #4ecdc4',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Z</label>
          <input
            type="number"
            step="0.1"
            value={z}
            onChange={(e) => setZ(e.target.value)}
            placeholder="6.25"
            style={{
              width: '100%',
              padding: '8px',
              background: '#0f3460',
              border: '1px solid #4ecdc4',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>通量值</label>
          <input
            type="number"
            step="0.01"
            value={fluxValue}
            onChange={(e) => setFluxValue(e.target.value)}
            placeholder="5.8"
            style={{
              width: '100%',
              padding: '8px',
              background: '#0f3460',
              border: '1px solid #4ecdc4',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px' }}>
          <input
            type="checkbox"
            id="isBoundary"
            checked={isBoundary}
            onChange={(e) => setIsBoundary(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          <label htmlFor="isBoundary" style={{ fontSize: '12px', color: '#ff6b6b' }}>边界点</label>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>备注</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="补录说明..."
            style={{
              width: '100%',
              padding: '8px',
              background: '#0f3460',
              border: '1px solid #4ecdc4',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>
        <button onClick={handleSubmit} style={{
          padding: '8px 20px',
          background: '#ffd93d',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          whiteSpace: 'nowrap'
        }}>
          添加
        </button>
      </div>

      {affectedSurfaces.length > 0 && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#ffd93d15', borderRadius: '8px', border: '1px solid #ffd93d' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffd93d', marginBottom: '8px' }}>
            📊 补录影响分析 - 以下曲面模型结果被影响:
          </div>
          {affectedSurfaces.map((s, i) => (
            <div key={i} style={{
              padding: '8px',
              background: '#0f3460',
              borderRadius: '4px',
              marginBottom: '4px',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{s.name}</span>
              <span style={{ color: s.fluxChange > 0.05 ? '#ff6b6b' : '#6bcb77' }}>
                通量变化: {(s.fluxChange * 100).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
