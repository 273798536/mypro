import { useAppStore } from '../store';
import type { RecordStatus } from '../types';
import { formatDateTime, sourceLabel, formatCoordinateSystem } from '../utils/helpers';

const FILTERS: { key: 'all' | RecordStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'ok', label: '可直接用' },
  { key: 'review-required', label: '需复核' },
  { key: 'duplicate', label: '重复导入' },
];

const statusText: Record<RecordStatus, string> = {
  ok: '可直接用',
  'review-required': '需复核',
  duplicate: '重复导入',
};

export default function RecordsPanel() {
  const { records, statusFilter, setStatusFilter, updateRecordStatus, removeRecord, clearRecords, addAlert } =
    useAppStore();

  const filtered = statusFilter === 'all' ? records : records.filter((r) => r.status === statusFilter);

  const counts = {
    all: records.length,
    ok: records.filter((r) => r.status === 'ok').length,
    'review-required': records.filter((r) => r.status === 'review-required').length,
    duplicate: records.filter((r) => r.status === 'duplicate').length,
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-section-title">可用性筛选</div>
        <div className="filter-bar">
          {FILTERS.map((f) => (
            <div
              key={f.key}
              className={`filter-chip ${statusFilter === f.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label} ({counts[f.key]})
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">
          评审记录 ({filtered.length})
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">暂无记录，可从"导入"页添加</div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className={`record-item ${r.status}`}>
            <div className="record-header">
              <span className="record-title">{r.name}</span>
              <span className={`record-status ${r.status}`}>{statusText[r.status]}</span>
            </div>
            <div className="record-meta">
              <span>📄 {formatCoordinateSystem(r.coordinateSystem)}</span>
              <span>🕐 {formatDateTime(r.createdAt)}</span>
              <span>📏 直径 {r.pipeline.diameter.toFixed(2)}m</span>
            </div>
            <div className="record-source">{sourceLabel(r.source)}</div>
            {r.issues.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {r.issues.map((issue, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: r.status === 'duplicate' ? '#e07070' : '#e0b060',
                      padding: '4px 8px',
                      background: '#0a1628',
                      borderRadius: 3,
                      marginBottom: 4,
                      borderLeft: `2px solid ${r.status === 'duplicate' ? '#e04040' : '#e0a040'}`,
                    }}
                  >
                    ⚠ {issue}
                  </div>
                ))}
              </div>
            )}
            <div className="btn-group" style={{ marginTop: 10 }}>
              {r.status !== 'ok' && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    updateRecordStatus(r.id, 'ok');
                    addAlert('info', `记录 "${r.name}" 已标记为可用`);
                  }}
                >
                  标记可用
                </button>
              )}
              {r.status === 'duplicate' && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    updateRecordStatus(r.id, 'review-required');
                    addAlert('info', `记录 "${r.name}" 改为待复核`);
                  }}
                >
                  改为待复核
                </button>
              )}
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  removeRecord(r.id);
                  addAlert('info', `已删除记录: ${r.name}`);
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {records.length > 0 && (
        <div className="panel-section">
          <div className="btn-group">
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm('确认清空所有评审记录？')) {
                  clearRecords();
                  addAlert('info', '已清空所有评审记录');
                }
              }}
            >
              清空全部记录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
