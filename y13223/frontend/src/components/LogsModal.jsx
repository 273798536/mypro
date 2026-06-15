import { useEffect, useState } from 'react'
import { api } from '../api/client'

const SOURCE_LABEL = {
  contract: '合同扫描件',
  manual: '后补备注',
  verbal: '口头说明',
  system: '系统识别',
  human_override: '人工复核',
}

const SOURCE_TAG = {
  contract: 'tag-blue',
  manual: 'tag-yellow',
  verbal: 'tag-gray',
  system: 'tag-gray',
  human_override: 'tag-red',
}

function fmtTime(s) {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN', { hour12: false })
}

export default function LogsModal({ track, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!track) return
    setLoading(true)
    api.logs(track.id).then(setLogs).catch(alert).finally(() => setLoading(false))
  }, [track])

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>修改历史 - {track?.track_name || track?.filename}</span>
          <button className="link-btn" onClick={onClose}>关闭</button>
        </div>
        <div className="modal-body">
          {loading && <div className="empty">加载中...</div>}
          {!loading && logs.length === 0 && <div className="empty">暂无修改记录</div>}
          {logs.map((log) => (
            <div className="log-item" key={log.id}>
              <div className="log-meta">
                <span className={`tag ${SOURCE_TAG[log.source] || 'tag-gray'}`}>
                  {SOURCE_LABEL[log.source] || log.source}
                </span>
                {' '}{fmtTime(log.changed_at)}
                {log.operator && <> · 操作人：{log.operator}</>}
                {log.source_ref && <> · 参考：{log.source_ref}</>}
              </div>
              <div className="log-diff">
                <b>{log.field_name}</b>：
                {log.old_value !== null && log.old_value !== undefined && (
                  <span className="old">「{log.old_value}」</span>
                )}
                {log.old_value !== null && log.old_value !== undefined && ' → '}
                {log.new_value !== null && log.new_value !== undefined && (
                  <span className="new">「{log.new_value}」</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
