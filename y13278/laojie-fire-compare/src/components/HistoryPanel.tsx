import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { formatChangeForReview, diffSnapshots } from '../services/versionEngine';
import type { VersionSnapshot } from '../types';

export function HistoryPanel() {
  const { currentView } = useApp();
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<VersionSnapshot | null>(null);
  const [compareB, setCompareB] = useState<VersionSnapshot | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  if (!currentView) return null;

  const { changes, snapshots } = currentView;

  const handleCompare = () => {
    if (compareA && compareB) setShowDiff(true);
  };

  const diffs = compareA && compareB ? diffSnapshots(compareA, compareB) : [];

  return (
    <div className="panel history-panel">
      <div className="panel-header">
        <h3>变更历史</h3>
        <div className="header-actions">
          <button
            className="btn btn-secondary btn-sm"
            disabled={!compareA || !compareB}
            onClick={handleCompare}
          >
            版本对比
          </button>
        </div>
      </div>
      <div className="panel-body">
        {changes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <div className="empty-title">暂无变更记录</div>
          </div>
        ) : (
          <>
            <div className="change-list">
              {changes.map(change => {
                const info = formatChangeForReview(change);
                const snapshot = snapshots.find(s => s.id === change.snapshotId);
                const isSelected = selectedChangeId === change.id;
                return (
                  <div
                    key={change.id}
                    className={`change-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedChangeId(isSelected ? null : change.id)}
                  >
                    <div className="change-head">
                      <span className="change-type-tag">{info.title}</span>
                      <span className="change-time">{info.timestamp}</span>
                    </div>
                    <div className="change-operator">操作人：{change.operator}</div>
                    {isSelected && (
                      <div className="change-detail">
                        <pre className="change-detail-text">{info.detail}</pre>
                        {snapshot && (
                          <div className="snapshot-actions">
                            <span className="snapshot-version">快照 v{snapshot.version}</span>
                            <button
                              className="btn btn-xs"
                              onClick={e => {
                                e.stopPropagation();
                                setCompareA(snapshot);
                              }}
                            >
                              设为 A
                            </button>
                            <button
                              className="btn btn-xs"
                              onClick={e => {
                                e.stopPropagation();
                                setCompareB(snapshot);
                              }}
                            >
                              设为 B
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {(compareA || compareB) && (
              <div className="compare-bar">
                <div>
                  对比：A = {compareA ? `v${compareA.version}` : '未选'} / B ={' '}
                  {compareB ? `v${compareB.version}` : '未选'}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setCompareA(null);
                    setCompareB(null);
                    setShowDiff(false);
                  }}
                >
                  清除
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {showDiff && compareA && compareB && (
        <div className="diff-modal" onClick={() => setShowDiff(false)}>
          <div className="diff-modal-content" onClick={e => e.stopPropagation()}>
            <div className="diff-header">
              <h4>
                版本对比：v{compareA.version} → v{compareB.version}
              </h4>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDiff(false)}>
                关闭
              </button>
            </div>
            <div className="diff-body">
              {diffs.length === 0 ? (
                <div>两个版本无差异</div>
              ) : (
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th>字段</th>
                      <th>变更前（v{compareA.version}）</th>
                      <th>变更后（v{compareB.version}）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d, i) => (
                      <tr key={i}>
                        <td className="diff-path">{d.path}</td>
                        <td className="diff-old">{formatDiffValue(d.oldValue)}</td>
                        <td className="diff-new">{formatDiffValue(d.newValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDiffValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v, null, 2);
    return s.length > 300 ? s.slice(0, 300) + '…' : s;
  } catch {
    return String(v);
  }
}
