import { useAppStore } from '../store';
import type { CoordinateSystem } from '../types';
import { generateId } from '../utils/helpers';

export default function ParamsPanel() {
  const {
    pipelines,
    obstacles,
    safeDistance,
    showCollisionZones,
    collisions,
    selectedPipelineId,
    setSafeDistance,
    setShowCollisionZones,
    addPipeline,
    updatePipeline,
    removePipeline,
    addObstacle,
    removeObstacle,
    setSelectedPipelineId,
  } = useAppStore();

  const violations = collisions.filter((c) => c.isViolation).length;

  return (
    <div>
      <div className="panel-section">
        <div className="panel-section-title">颜色图例</div>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#3aa0e0' }} />
            管线（正常）
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#e0a040' }} />
            管线（接近）
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#e04040' }} />
            管线（越界）
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#888899' }} />
            桩腿
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#7766aa' }} />
            结构物
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#665544' }} />
            礁石
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#ff2020' }} />
            碰撞点
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">避障参数</div>
        <div className="form-row">
          <label>安全距离 (m)</label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.1"
            value={safeDistance}
            onChange={(e) => setSafeDistance(parseFloat(e.target.value))}
          />
          <span className="value-readout">{safeDistance.toFixed(1)}</span>
        </div>
        <div className="form-row">
          <label>安全域可视化</label>
          <select
            value={showCollisionZones ? 'on' : 'off'}
            onChange={(e) => setShowCollisionZones(e.target.value === 'on')}
          >
            <option value="on">显示</option>
            <option value="off">关闭</option>
          </select>
        </div>
        <div className="form-row" style={{ marginTop: 8 }}>
          <label>越界告警</label>
          <span
            className="record-status"
            style={{
              background: violations > 0 ? '#3a1a1a' : '#1a3a22',
              color: violations > 0 ? '#e07070' : '#6ae08a',
            }}
          >
            {violations > 0 ? `${violations} 处越界` : '无越界'}
          </span>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">管线管理</div>
        {pipelines.length === 0 && (
          <div className="empty-state">暂无管线，点击下方按钮添加</div>
        )}
        {pipelines.map((p) => (
          <div
            key={p.id}
            className="view-snapshot"
            onClick={() => setSelectedPipelineId(p.id === selectedPipelineId ? null : p.id)}
            style={{
              borderColor: p.id === selectedPipelineId ? '#5dade2' : undefined,
              background: p.id === selectedPipelineId ? '#132338' : undefined,
            }}
          >
            <div className="view-snapshot-header">
              <span className="view-snapshot-name">{p.name}</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removePipeline(p.id);
                }}
              >
                删除
              </button>
            </div>
            <div className="view-snapshot-meta">
              直径 {p.diameter.toFixed(2)} m · 坐标系：{p.start.coordinateSystem}
            </div>
            {p.id === selectedPipelineId && (
              <div style={{ marginTop: 8 }}>
                <div className="form-row">
                  <label>起点 X</label>
                  <input
                    type="number"
                    step="0.5"
                    value={p.start.position.x}
                    onChange={(e) =>
                      updatePipeline(p.id, {
                        start: {
                          ...p.start,
                          position: { ...p.start.position, x: parseFloat(e.target.value) || 0 },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-row">
                  <label>起点 Y</label>
                  <input
                    type="number"
                    step="0.5"
                    value={p.start.position.y}
                    onChange={(e) =>
                      updatePipeline(p.id, {
                        start: {
                          ...p.start,
                          position: { ...p.start.position, y: parseFloat(e.target.value) || 0 },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-row">
                  <label>起点 Z</label>
                  <input
                    type="number"
                    step="0.5"
                    value={p.start.position.z}
                    onChange={(e) =>
                      updatePipeline(p.id, {
                        start: {
                          ...p.start,
                          position: { ...p.start.position, z: parseFloat(e.target.value) || 0 },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-row">
                  <label>终点 X</label>
                  <input
                    type="number"
                    step="0.5"
                    value={p.end.position.x}
                    onChange={(e) =>
                      updatePipeline(p.id, {
                        end: {
                          ...p.end,
                          position: { ...p.end.position, x: parseFloat(e.target.value) || 0 },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-row">
                  <label>终点 Y</label>
                  <input
                    type="number"
                    step="0.5"
                    value={p.end.position.y}
                    onChange={(e) =>
                      updatePipeline(p.id, {
                        end: {
                          ...p.end,
                          position: { ...p.end.position, y: parseFloat(e.target.value) || 0 },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-row">
                  <label>终点 Z</label>
                  <input
                    type="number"
                    step="0.5"
                    value={p.end.position.z}
                    onChange={(e) =>
                      updatePipeline(p.id, {
                        end: {
                          ...p.end,
                          position: { ...p.end.position, z: parseFloat(e.target.value) || 0 },
                        },
                      })
                    }
                  />
                </div>
                <div className="form-row">
                  <label>直径</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={p.diameter}
                    onChange={(e) =>
                      updatePipeline(p.id, { diameter: parseFloat(e.target.value) || 0.1 })
                    }
                  />
                </div>
                <div className="form-row">
                  <label>坐标系</label>
                  <select
                    value={p.start.coordinateSystem}
                    onChange={(e) => {
                      const sys = e.target.value as CoordinateSystem;
                      updatePipeline(p.id, {
                        start: { ...p.start, coordinateSystem: sys },
                        end: { ...p.end, coordinateSystem: sys },
                      });
                    }}
                  >
                    <option value="world">世界坐标系</option>
                    <option value="local">局部坐标系</option>
                    <option value="geographic">地理坐标系</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="btn-group" style={{ marginTop: 8 }}>
          <button
            className="btn"
            onClick={() => {
              const idx = pipelines.length + 1;
              addPipeline({
                id: generateId(),
                name: `海管 B-${String(idx).padStart(2, '0')}`,
                diameter: 0.5,
                start: {
                  id: generateId(),
                  position: { x: -30 + idx * 5, y: -2, z: -10 },
                  coordinateSystem: 'world',
                },
                end: {
                  id: generateId(),
                  position: { x: 30 + idx * 5, y: -2, z: 10 },
                  coordinateSystem: 'world',
                },
              });
            }}
          >
            + 新增管线
          </button>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">障碍物</div>
        {obstacles.length === 0 && (
          <div className="empty-state">暂无障碍物</div>
        )}
        {obstacles.map((o) => (
          <div key={o.id} className="view-snapshot">
            <div className="view-snapshot-header">
              <span className="view-snapshot-name">{o.name}</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeObstacle(o.id)}
              >
                删除
              </button>
            </div>
            <div className="view-snapshot-meta">
              类型：{o.type} · 位置 ({o.position.x.toFixed(1)}, {o.position.y.toFixed(1)}, {o.position.z.toFixed(1)})
            </div>
          </div>
        ))}
        <div className="btn-group" style={{ marginTop: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const idx = obstacles.length + 1;
              addObstacle({
                id: generateId(),
                name: `障碍物 O-${String(idx).padStart(2, '0')}`,
                type: 'structure',
                position: { x: (Math.random() - 0.5) * 60, y: -3, z: (Math.random() - 0.5) * 60 },
                size: { x: 4 + Math.random() * 4, y: 3 + Math.random() * 3, z: 4 + Math.random() * 4 },
                coordinateSystem: 'world',
              });
            }}
          >
            + 新增结构物
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const idx = obstacles.length + 1;
              addObstacle({
                id: generateId(),
                name: `桩腿 P-${String(idx).padStart(2, '0')}`,
                type: 'pile',
                position: { x: (Math.random() - 0.5) * 60, y: 0, z: (Math.random() - 0.5) * 60 },
                size: { x: 2.5, y: 12, z: 2.5 },
                coordinateSystem: 'world',
              });
            }}
          >
            + 新增桩腿
          </button>
        </div>
      </div>
    </div>
  );
}
