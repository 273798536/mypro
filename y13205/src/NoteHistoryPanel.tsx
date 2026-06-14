import { NoteChangeEntry } from './types'

interface Props {
  noteChanges: NoteChangeEntry[]
}

export default function NoteHistoryPanel({ noteChanges }: Props) {
  if (noteChanges.length === 0) return <div className="empty-state">暂无备注变更记录</div>
  return (
    <div>
      {noteChanges.map(c => (
        <div key={c.id} className="change-log-item">
          <div>
            <span className="impact-label">记录:</span> {c.recordId}
            <span className="change-meta" style={{ marginLeft: 8 }}>{c.changedAt} {c.changedBy}</span>
          </div>
          <div className="change-diff">
            <span className="change-old">{c.oldValue || '(空)'}</span>
            {' → '}
            <span className="change-new">{c.newValue || '(空)'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
