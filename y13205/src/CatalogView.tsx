import { TrackCatalogEntry } from './types'

interface Props {
  catalog: TrackCatalogEntry[]
  oldCatalog: TrackCatalogEntry[]
}

export default function CatalogView({ catalog, oldCatalog }: Props) {
  return (
    <div>
      <div className="section-title">曲目表对照</div>
      <div className="catalog-diff">
        <div className="catalog-col">
          <h4>当前版本</h4>
          <table>
            <thead>
              <tr><th>ID</th><th>曲名</th><th>别名</th><th>版本</th><th>最新</th></tr>
            </thead>
            <tbody>
              {catalog.map(e => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.name}</td>
                  <td>{e.aliases.join('、') || '—'}</td>
                  <td>v{e.version}</td>
                  <td>{e.latest ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="catalog-col">
          <h4>旧版</h4>
          <table>
            <thead>
              <tr><th>ID</th><th>曲名</th><th>别名</th><th>版本</th><th>最新</th></tr>
            </thead>
            <tbody>
              {oldCatalog.map(e => {
                const curr = catalog.find(c => c.id === e.id)
                const changed = curr && curr.version !== e.version
                return (
                  <tr key={e.id} style={changed ? { background: '#fff1f0' } : undefined}>
                    <td>{e.id}</td>
                    <td>{e.name}</td>
                    <td>{e.aliases.join('、') || '—'}</td>
                    <td>v{e.version}{changed && <span style={{ color: '#cf1322', fontSize: 11 }}> (→v{curr.version})</span>}</td>
                    <td>{e.latest ? '✓' : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
