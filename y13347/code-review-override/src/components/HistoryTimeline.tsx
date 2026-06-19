import type { ReviewRecord, HistoryEntry } from '../types'

interface Props {
  record: ReviewRecord
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '（空）'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120)
  return String(v)
}

export default function HistoryTimeline({ record }: Props) {
  const sorted = [...record.history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="detail-section">
      <h4>
        🕒 历史版本（共 {record.history.length} 条，保留所有修改，不只最终值）
      </h4>
      {sorted.length === 0 ? (
        <div className="empty-state" style={{ padding: 20 }}>
          暂无历史记录
        </div>
      ) : (
        <div className="history-timeline">
          {sorted.map((h: HistoryEntry) => (
            <div key={h.id} className="history-item">
              <div className="history-meta">
                <span className="history-operator">{h.operator}</span>
                <span className="history-field">修改字段：{h.field}</span>
                <span style={{ marginLeft: 8, color: '#6b7280' }}>
                  {new Date(h.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
              {h.oldValue !== undefined && h.oldValue !== null && (
                <div className="history-diff">
                  <span className="diff-old">- {formatValue(h.oldValue)}</span>
                  <span style={{ margin: '0 6px', color: '#9ca3af' }}>→</span>
                  <span className="diff-new">+ {formatValue(h.newValue)}</span>
                </div>
              )}
              {h.note && <div className="history-note">📌 {h.note}</div>}
              {h.field === 'currentScreenshotUrl' && h.newValue && (
                <div className="history-screenshot">
                  🖼 历史截图版本：{formatValue(h.newValue)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
