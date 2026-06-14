import { AliasConflict } from './types'

interface Props {
  conflicts: AliasConflict[]
}

export default function AliasConflictPanel({ conflicts }: Props) {
  if (conflicts.length === 0) return <div className="empty-state">无别名冲突</div>
  return (
    <div>
      {conflicts.map((c, i) => (
        <div key={i} className="alias-conflict">
          <span className="alias-name">「{c.aliasName}」</span>
          同时出现在：
          {c.trackNames.map((name, j) => (
            <span key={j}>
              {j > 0 ? '、' : ''}
              <strong>{name}</strong>
              <span style={{ color: '#999', fontSize: 11 }}>(曲目表 ID: {c.catalogEntryIds[j]})</span>
            </span>
          ))}
          <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
            请以曲目表原始条目为准确认指代
          </div>
        </div>
      ))}
    </div>
  )
}
