import { ReviewRunResult, TrackCatalogEntry, NoteChangeEntry } from './types'

interface Props {
  result: ReviewRunResult
  catalog: TrackCatalogEntry[]
  noteChanges: NoteChangeEntry[]
}

export default function DeliveryPanel({ result, catalog, noteChanges }: Props) {
  return (
    <div>
      <div className="section-title">交付说明</div>
      <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
        以下三份材料可对给别人看，无需额外解释。
      </p>

      <div className="delivery-section">
        <h4>1. 曲目表</h4>
        <div className="desc">当前曲目表所有条目，含曲名、别名、版本号。</div>
        <table>
          <thead><tr><th>ID</th><th>曲名</th><th>别名</th><th>版本</th><th>最新</th></tr></thead>
          <tbody>
            {catalog.map(e => (
              <tr key={e.id}>
                <td>{e.id}</td><td>{e.name}</td><td>{e.aliases.join('、') || '—'}</td><td>v{e.version}</td><td>{e.latest ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="delivery-section">
        <h4>2. 处理记录</h4>
        <div className="desc">每条复核记录的来源、对结论的影响和备注。</div>
        <table>
          <thead><tr><th>曲名</th><th>时码</th><th>版本</th><th>来源</th><th>影响</th><th>备注</th></tr></thead>
          <tbody>
            {result.records.map(r => (
              <tr key={r.id}>
                <td>{r.trackName}</td>
                <td style={{ fontFamily: 'monospace' }}>{r.timecode}</td>
                <td>v{r.version}</td>
                <td>{r.sourceLabel}</td>
                <td style={{ fontSize: 12 }}>{r.conclusionImpact}</td>
                <td style={{ fontSize: 12 }}>{r.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {noteChanges.length > 0 && (
        <div className="delivery-section">
          <h4>4. 备注变更历史</h4>
          <div className="desc">彩排前所有备注修改记录，操作人、时间和新旧值。</div>
          <table>
            <thead><tr><th>记录 ID</th><th>时间</th><th>操作人</th><th>旧值</th><th>新值</th></tr></thead>
            <tbody>
              {noteChanges.map(c => {
                const rec = result.records.find(r => r.id === c.recordId)
                return (
                  <tr key={c.id}>
                    <td>{c.recordId}{rec && <span style={{ color: '#999', fontSize: 11 }}> ({rec.trackName})</span>}</td>
                    <td style={{ fontSize: 12 }}>{c.changedAt}</td>
                    <td>{c.changedBy}</td>
                    <td style={{ fontSize: 12, color: '#cf1322' }}>{c.oldValue || '(空)'}</td>
                    <td style={{ fontSize: 12, color: '#389e0d' }}>{c.newValue || '(空)'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="delivery-section">
        <h4>3. 接口返回</h4>
        <div className="desc">本次复核的原始接口数据，可直接复制。</div>
        <pre className="api-response">{JSON.stringify(result.apiResponse, null, 2)}</pre>
      </div>
    </div>
  )
}
