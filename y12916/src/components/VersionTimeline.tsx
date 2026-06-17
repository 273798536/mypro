import React, { useState } from 'react';
import { ModelVersion, VersionStatus } from '../types';
import { modelVersions } from '../mockData';

const statusBadgeClass: Record<VersionStatus, string> = {
  staging: 'badge-info',
  grayscale: 'badge-warning',
  production: 'badge-success',
  rollback: 'badge-danger',
};

const statusLabel: Record<VersionStatus, string> = {
  staging: '待发布',
  grayscale: '灰度中',
  production: '已上线',
  rollback: '已回滚',
};

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

const VersionTimeline: React.FC<Props> = ({ selectedId, onSelect }) => {
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon" />
          版本追踪时间线
        </div>
        <div className="legend">
          <div className="legend-item">
            <span className="badge-dot" style={{ background: '#4f8cff' }} />
            待发布
          </div>
          <div className="legend-item">
            <span className="badge-dot" style={{ background: '#f5c451' }} />
            灰度中
          </div>
          <div className="legend-item">
            <span className="badge-dot" style={{ background: '#3ecf8e' }} />
            已上线
          </div>
          <div className="legend-item">
            <span className="badge-dot" style={{ background: '#ff5c7a' }} />
            已回滚
          </div>
        </div>
      </div>
      <div className="card">
        <div className="version-timeline">
          {modelVersions.map((v: ModelVersion, idx: number) => {
            const isActive = v.id === selectedId;
            const isHover = v.id === hoverId;
            return (
              <div
                key={v.id}
                className={`version-node ${isActive ? 'active' : ''} ${v.status === 'rollback' ? 'rollback' : ''}`}
                onClick={() => onSelect(v.id)}
                onMouseEnter={() => setHoverId(v.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <div className="version-node-card" style={isHover && !isActive ? { transform: 'translateY(-3px)', borderColor: '#7aa9ff' } : {}}>
                  <div className="version-node-tag">
                    <span className={`badge ${statusBadgeClass[v.status]}`}>
                      <span className="badge-dot" />
                      {statusLabel[v.status]}
                    </span>
                  </div>
                  <div className="version-name">
                    {v.versionName}
                    {v.status === 'rollback' && <span style={{ color: '#ff8fa3', fontSize: 12 }}> ⟲</span>}
                  </div>
                  <div className="version-meta">
                    {v.createdAt} · {v.createdBy}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                    {v.description}
                  </div>
                  {v.status === 'rollback' && v.rollbackReason && (
                    <div style={{ fontSize: 11, color: '#ff8fa3', padding: '6px 8px', background: 'rgba(255,92,122,0.08)', borderRadius: 4, marginBottom: 8, lineHeight: 1.5 }}>
                      ⚠ {v.rollbackReason}
                    </div>
                  )}
                  <div className="version-metrics">
                    <div className="version-metric">
                      <div className="version-metric-label">Accuracy</div>
                      <div className="version-metric-value" style={{ color: v.status === 'rollback' ? '#ff8fa3' : 'var(--text-primary)' }}>
                        {(v.overallAccuracy * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="version-metric">
                      <div className="version-metric-label">Precision</div>
                      <div className="version-metric-value">
                        {(v.overallPrecision * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="version-metric">
                      <div className="version-metric-label">F1</div>
                      <div className="version-metric-value">
                        {(v.overallF1 * 100).toFixed(1)}%
                      </div>
                    </div>
                    {v.flaggedSamples.length > 0 && (
                      <div className="version-metric">
                        <div className="version-metric-label">风险样本</div>
                        <div className="version-metric-value" style={{ color: '#f5c451' }}>
                          {v.flaggedSamples.length}
                        </div>
                      </div>
                    )}
                  </div>
                  {idx < modelVersions.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: -8,
                        transform: 'translateY(-50%)',
                        width: 16,
                        height: 2,
                        background: 'var(--border-subtle)',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default VersionTimeline;
