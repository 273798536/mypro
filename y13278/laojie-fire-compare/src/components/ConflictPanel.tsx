import { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { ConflictInfo } from '../types';

export function ConflictPanel() {
  const { currentView, resolveConflict, loading } = useApp();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (!currentView) return null;

  const unresolved = currentView.plan.conflicts.filter(c => !c.resolved);
  const resolved = currentView.plan.conflicts.filter(c => c.resolved);

  if (unresolved.length === 0 && resolved.length === 0) {
    return (
      <div className="panel conflict-panel">
        <div className="panel-header">
          <h3>冲突检测</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-title">数据一致</div>
            <div className="empty-desc">未检测到命名冲突或内容覆盖</div>
          </div>
        </div>
      </div>
    );
  }

  const handleResolve = (
    conflict: ConflictInfo,
    resolution: 'accept_new' | 'keep_old' | 'merge_manual',
  ) => {
    let targetSnapshotId: string | undefined;
    if (resolution === 'keep_old' && currentView.snapshots.length >= 2) {
      targetSnapshotId = currentView.snapshots[1].id;
    }
    resolveConflict(conflict.id, resolution, targetSnapshotId);
    setResolvingId(null);
  };

  return (
    <div className="panel conflict-panel">
      <div className="panel-header">
        <h3>冲突检测</h3>
        {unresolved.length > 0 && (
          <span className="badge badge-red pulse">{unresolved.length} 处待处理</span>
        )}
      </div>
      <div className="panel-body">
        {unresolved.length > 0 && (
          <div className="conflict-section">
            <div className="conflict-section-title">待复核冲突</div>
            {unresolved.map(c => (
              <div key={c.id} className={`conflict-item conflict-${c.severity}`}>
                <div className="conflict-head">
                  <span className={`severity-dot severity-${c.severity}`} />
                  <span className="conflict-title">{c.title}</span>
                </div>
                <div className="conflict-detail">{c.detail}</div>
                <div className="conflict-meta">
                  <span>检测时间：{new Date(c.detectedAt).toLocaleString()}</span>
                  <span>影响字段：{c.affectedFields.join(', ')}</span>
                </div>
                {resolvingId === c.id ? (
                  <div className="conflict-actions">
                    <div className="conflict-action-desc">请选择处理方式：</div>
                    <div className="conflict-action-buttons">
                      <button
                        className="btn btn-primary"
                        disabled={loading}
                        onClick={() => handleResolve(c, 'accept_new')}
                      >
                        ✅ 采用新内容
                      </button>
                      <button
                        className="btn btn-secondary"
                        disabled={loading}
                        onClick={() => handleResolve(c, 'keep_old')}
                      >
                        ⏪ 保留原判断
                      </button>
                      <button
                        className="btn btn-outline"
                        disabled={loading}
                        onClick={() => handleResolve(c, 'merge_manual')}
                      >
                        ✏️ 人工合并
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setResolvingId(null)}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="conflict-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setResolvingId(c.id)}
                      disabled={loading}
                    >
                      开始复核
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {resolved.length > 0 && (
          <div className="conflict-section">
            <div className="conflict-section-title">已解决（{resolved.length}）</div>
            {resolved.map(c => (
              <div key={c.id} className="conflict-item conflict-resolved">
                <div className="conflict-head">
                  <span className="severity-dot severity-resolved" />
                  <span className="conflict-title">{c.title}</span>
                </div>
                <div className="conflict-meta">
                  <span>
                    处理人：{c.resolvedBy} ·{' '}
                    {c.resolution === 'accept_new'
                      ? '采用新内容'
                      : c.resolution === 'keep_old'
                      ? '保留原判断'
                      : '人工合并'}
                  </span>
                  <span>{c.resolvedAt && new Date(c.resolvedAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
