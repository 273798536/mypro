import { ReviewRunResult, TrackCatalogEntry, ReviewRecord } from './types'

interface Props {
  result: ReviewRunResult
  catalog: TrackCatalogEntry[]
  records: ReviewRecord[]
}

export default function DeliveryPanel({ result, catalog, records }: Props) {
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
        <div className="desc">每条复核记录的来源和对结论的影响。</div>
        <table>
          <thead><tr><th>曲名</th><th>时码</th><th>版本</th><th>来源</th><th>影响</th></tr></thead>
          <tbody>
            {result.records.map(r => (
              <tr key={r.id}>
                <td>{r.trackName}</td>
                <td style={{ fontFamily: 'monospace' }}>{r.timecode}</td>
                <td>v{r.version}</td>
                <td>{r.sourceLabel}</td>
                <td style={{ fontSize: 12 }}>{r.conclusionImpact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="delivery-section">
        <h4>3. 接口返回</h4>
        <div className="desc">本次复核的原始接口数据，可直接复制。</div>
        <pre className="api-response">{JSON.stringify(result.apiResponse, null, 2)}</pre>
      </div>
    </div>
  )
}
