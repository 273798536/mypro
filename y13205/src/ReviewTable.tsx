import { useState } from 'react'
import { ReviewRecord, ReviewRunResult, NoteChangeEntry, TrackCatalogEntry, RecordSource } from './types'

interface Props {
  result: ReviewRunResult
  catalog: TrackCatalogEntry[]
  expandedRecord: string | null
  setExpandedRecord: (id: string | null) => void
  sourceTagClass: (s: RecordSource) => string
  sourceTagLabel: (s: RecordSource) => string
  showApiResponse: boolean
  setShowApiResponse: (v: boolean) => void
  onRerun: () => void
  onNoteChange: (recordId: string, newNote: string, changedBy: string) => void
  noteChanges: NoteChangeEntry[]
}

export default function ReviewTable({
  result, catalog, expandedRecord, setExpandedRecord,
  sourceTagClass, sourceTagLabel,
  showApiResponse, setShowApiResponse, onRerun,
  onNoteChange, noteChanges,
}: Props) {
  return (
    <div>
      <div className="action-row">
        <button className="btn btn-primary" onClick={onRerun}>重跑复核</button>
        <button className="btn" onClick={() => setShowApiResponse(!showApiResponse)}>
          {showApiResponse ? '隐藏接口返回' : '查看接口返回'}
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>曲名</th>
            <th>时码</th>
            <th>版本</th>
            <th>来源</th>
            <th>对结论的影响</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {result.records.map(r => {
            const isExpanded = expandedRecord === r.id
            const catalogEntry = catalog.find(e => e.id === r.catalogEntryId)
            return (
              <tr key={r.id}>
                <td>
                  <strong>{r.trackName}</strong>
                  {catalogEntry && (
                    <div style={{ marginTop: 2 }}>
                      <span
                        className="trace-link"
                        onClick={() => setExpandedRecord(isExpanded ? null : r.id)}
                      >
                        {isExpanded ? '收起曲目表原文' : '追溯到曲目表原文'}
                      </span>
                    </div>
                  )}
                  {isExpanded && catalogEntry && (
                    <div style={{ marginTop: 6, padding: '6px 8px', background: '#f0f5ff', borderRadius: 3, fontSize: 12 }}>
                      <div><span className="impact-label">曲目表 ID:</span> {catalogEntry.id}</div>
                      <div><span className="impact-label">曲名:</span> {catalogEntry.name}</div>
                      <div><span className="impact-label">别名:</span> {catalogEntry.aliases.join('、') || '无'}</div>
                      <div><span className="impact-label">当前版本:</span> v{catalogEntry.version}</div>
                      <div><span className="impact-label">是否最新:</span> {catalogEntry.latest ? '是' : '否'}</div>
                    </div>
                  )}
                </td>
                <td style={{ fontFamily: 'monospace' }}>{r.timecode}</td>
                <td>v{r.version}</td>
                <td><span className={`source-tag ${sourceTagClass(r.source)}`}>{sourceTagLabel(r.source)}</span></td>
                <td>
                  <div className={`impact-box ${
                    r.source === 'old_catalog' ? 'old-impact' :
                    r.source === 'normal' ? 'normal-impact' : 'verbal-impact'
                  }`}>
                    <span className="impact-label">影响原因:</span>{r.conclusionImpact}
                  </div>
                </td>
                <td>
                  <NoteCell record={r} onNoteChange={onNoteChange} noteChanges={noteChanges} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {result.aliasConflicts.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-title">别名冲突（追溯至曲目表原始说法）</div>
          {result.aliasConflicts.map((c, i) => (
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
                请以曲目表原始条目为准确认指代，避免因别名重复导致结论歧义
              </div>
            </div>
          ))}
        </div>
      )}

      {showApiResponse && (
        <div style={{ marginTop: 20 }}>
          <div className="section-title">接口返回</div>
          <pre className="api-response">{JSON.stringify(result.apiResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function NoteCell({
  record, onNoteChange, noteChanges,
}: {
  record: ReviewRecord
  onNoteChange: (recordId: string, newNote: string, changedBy: string) => void
  noteChanges: NoteChangeEntry[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [who, setWho] = useState('')
  const changes = noteChanges.filter(c => c.recordId === record.id)

  return (
    <div>
      <div style={{ fontSize: 12 }}>{record.note || '—'}</div>
      <div className="note-edit">
        {!editing ? (
          <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { setEditing(true); setDraft(record.note) }}>改备注</button>
        ) : (
          <>
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="新备注" />
            <input value={who} onChange={e => setWho(e.target.value)} placeholder="操作人" style={{ width: 80 }} />
            <button className="btn btn-primary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { onNoteChange(record.id, draft, who || '匿名'); setEditing(false) }}>保存</button>
            <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setEditing(false)}>取消</button>
          </>
        )}
      </div>
      {changes.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>变更历史:</div>
          {changes.map(c => (
            <div key={c.id} style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              <span className="change-meta">{c.changedAt} {c.changedBy}</span>
              <div className="change-diff">
                <span className="change-old">{c.oldValue || '(空)'}</span>
                {' → '}
                <span className="change-new">{c.newValue || '(空)'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

