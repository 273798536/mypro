import { useEffect, useState } from 'react'
import { api } from './api/client'
import EditTrackModal from './components/EditTrackModal'
import VerifyModal from './components/VerifyModal'
import LogsModal from './components/LogsModal'

const ANOMALY_LABEL = {
  filename_mismatch: '文件名对不上',
  missing: '文件缺失',
  extra: '文件多余',
  other: '其他异常',
}

const SOURCE_LABEL = {
  contract: '合同扫描件',
  manual: '后补备注',
  verbal: '口头说明',
  system: '系统识别',
}

const SOURCE_TAG = {
  contract: 'tag-blue',
  manual: 'tag-yellow',
  verbal: 'tag-gray',
  system: 'tag-gray',
}

export default function App() {
  const [tracks, setTracks] = useState([])
  const [onlyAnomaly, setOnlyAnomaly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editTrack, setEditTrack] = useState(null)
  const [verifyTrack, setVerifyTrack] = useState(null)
  const [logsTrack, setLogsTrack] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    setLoading(true)
    api.list(onlyAnomaly).then(setTracks).catch(alert).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [onlyAnomaly])

  const handleSave = async (form) => {
    try {
      if (editTrack) {
        await api.update(editTrack.id, form)
      } else {
        await api.create({
          filename: form.filename,
          track_name: form.track_name,
          track_no: form.track_no || undefined,
          artist: form.artist || undefined,
          contract_scan_ref: form.contract_scan_ref || undefined,
          is_anomaly: form.is_anomaly,
          anomaly_type: form.anomaly_type || undefined,
          current_note: form.current_note || undefined,
          current_source: form.current_source,
        }, { operator: form.operator || undefined, source_ref: form.source_ref || undefined })
      }
      setEditTrack(null)
      setShowCreate(false)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleVerify = async (form) => {
    try {
      await api.verify(verifyTrack.id, form)
      setVerifyTrack(null)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleRemove = async (t) => {
    if (!confirm(`删除「${t.track_name}」？`)) return
    try {
      await api.remove(t.id)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>🥁 鼓组节拍异常提醒</h1>
          <div className="subtitle">琴房前台 · 曲目合同扫描件核对 & 交接清单</div>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => { setEditTrack(null); setShowCreate(true) }}>
          ＋ 新增记录
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={onlyAnomaly} onChange={(e) => setOnlyAnomaly(e.target.checked)} />
          只看异常
        </label>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#888' }}>
          共 {tracks.length} 条，异常 {tracks.filter(t => t.is_anomaly).length} 条
        </span>
        <a className="btn btn-secondary" href={api.exportUrl(onlyAnomaly)}>
          导出 Excel
        </a>
        <button className="btn btn-secondary" onClick={load}>刷新</button>
      </div>

      <div className="table-wrap">
        {loading && <div className="empty">加载中...</div>}
        {!loading && tracks.length === 0 && (
          <div className="empty">
            暂无数据 · 点击「新增记录」把合同扫描件里的曲目录进来
            <div className="hint">坏材料处理：先看合同扫描件定位（contract_scan_ref），再核对文件名和曲目表</div>
          </div>
        )}
        {!loading && tracks.length > 0 && (
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>文件名</th>
                <th>曲目名称</th>
                <th>异常说明</th>
                <th>备注 / 口径</th>
                <th>状态</th>
                <th style={{ width: 180 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t, i) => (
                <tr key={t.id} className={t.is_anomaly ? 'anomaly' : ''}>
                  <td>{i + 1}</td>
                  <td>
                    <div>{t.filename}</div>
                    {t.track_no && <div className="hint">No. {t.track_no}</div>}
                    {t.artist && <div className="hint">{t.artist}</div>}
                  </td>
                  <td>
                    <div>{t.track_name}</div>
                    {t.contract_scan_ref && (
                      <div className="hint">📄 {t.contract_scan_ref}</div>
                    )}
                  </td>
                  <td>
                    {t.is_anomaly ? (
                      <>
                        <div className="human-reason">{t.anomaly_reason_human}</div>
                        {t.anomaly_type && (
                          <span className="tag tag-red">{ANOMALY_LABEL[t.anomaly_type] || t.anomaly_type}</span>
                        )}
                        {t.bad_data_hint && <div className="hint">🔍 {t.bad_data_hint}</div>}
                      </>
                    ) : (
                      <span className="tag tag-green">正常</span>
                    )}
                  </td>
                  <td>
                    {t.current_note ? (
                      <div>
                        <div>{t.current_note}</div>
                        {t.current_source && (
                          <span className={`tag ${SOURCE_TAG[t.current_source] || 'tag-gray'}`} style={{ marginTop: 4 }}>
                            来源：{SOURCE_LABEL[t.current_source] || t.current_source}
                          </span>
                        )}
                      </div>
                    ) : <span className="hint">（无备注）</span>}
                    {t.change_logs && t.change_logs.length > 0 && (
                      <div className="hint">已修改 {t.change_logs.length} 次</div>
                    )}
                  </td>
                  <td>
                    {t.human_verified ? (
                      <>
                        <span className="tag tag-green">已复核</span>
                        {t.human_verifier && <div className="hint">by {t.human_verifier}</div>}
                        {t.human_verify_reason && <div className="hint">{t.human_verify_reason}</div>}
                        {t.next_step && <div className="hint">→ {t.next_step}</div>}
                      </>
                    ) : (
                      t.is_anomaly ? (
                        <span className="tag tag-yellow">待人工确认</span>
                      ) : <span className="tag tag-gray">正常</span>
                    )}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditTrack(t)}>改备注</button>
                      <button className="btn btn-sm btn-primary" onClick={() => setVerifyTrack(t)}>人工复核</button>
                      <button className="link-btn" onClick={() => setLogsTrack(t)}>历史</button>
                      <button className="link-btn" style={{ color: '#c00000' }} onClick={() => handleRemove(t)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showCreate || editTrack) && (
        <EditTrackModal
          track={editTrack}
          onSave={handleSave}
          onClose={() => { setEditTrack(null); setShowCreate(false) }}
        />
      )}
      {verifyTrack && (
        <VerifyModal track={verifyTrack} onSave={handleVerify} onClose={() => setVerifyTrack(null)} />
      )}
      {logsTrack && (
        <LogsModal track={logsTrack} onClose={() => setLogsTrack(null)} />
      )}
    </div>
  )
}
