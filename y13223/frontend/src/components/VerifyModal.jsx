import { useState } from 'react'

export default function VerifyModal({ track, onSave, onClose }) {
  const [form, setForm] = useState({
    verified: true,
    verifier: '',
    reason: '',
    next_step: '',
    operator: '',
  })

  const set = (k, v) => setForm({ ...form, [k]: v })

  const submit = () => {
    if (!form.verifier || !form.reason) {
      alert('请填写复核人和复核原因')
      return
    }
    onSave(form)
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>人工复核 - 覆盖旧判断</span>
          <button className="link-btn" onClick={onClose}>关闭</button>
        </div>
        <div className="modal-body">
          {track && (
            <div style={{ background: '#fffbe6', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              <div><b>{track.track_name}</b> / {track.filename}</div>
              {track.anomaly_reason_human && <div style={{ marginTop: 4 }}>{track.anomaly_reason_human}</div>}
            </div>
          )}
          <div className="field">
            <label>复核结果</label>
            <label className="checkbox" style={{ marginRight: 18 }}>
              <input type="radio" checked={form.verified} onChange={() => set('verified', true)} />
              已确认异常（保留）
            </label>
            <label className="checkbox">
              <input type="radio" checked={!form.verified} onChange={() => set('verified', false)} />
              不构成异常（取消标记）
            </label>
          </div>
          <div className="field-row">
            <div className="field">
              <label>复核人 *</label>
              <input value={form.verifier} onChange={(e) => set('verifier', e.target.value)} placeholder="你的名字" />
            </div>
            <div className="field">
              <label>操作人（留痕）</label>
              <input value={form.operator} onChange={(e) => set('operator', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>复核原因 *（为什么这么判断？）</label>
            <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)}
              placeholder="比如：已核对合同扫描件第3行，文件名确实写错，后续用曲目表名称为准" />
          </div>
          <div className="field">
            <label>下一步（需要谁做什么）</label>
            <textarea value={form.next_step} onChange={(e) => set('next_step', e.target.value)}
              placeholder="比如：请小周一并在发行系统改文件名，完成后回传" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={submit}>提交复核</button>
        </div>
      </div>
    </div>
  )
}
