import { useState, useEffect } from 'react'

export default function EditTrackModal({ track, onSave, onClose }) {
  const [form, setForm] = useState({
    filename: '',
    track_name: '',
    track_no: '',
    artist: '',
    contract_scan_ref: '',
    is_anomaly: false,
    anomaly_type: '',
    current_note: '',
    current_source: 'manual',
    operator: '',
    source_ref: '',
  })

  useEffect(() => {
    if (track) {
      setForm({
        filename: track.filename || '',
        track_name: track.track_name || '',
        track_no: track.track_no || '',
        artist: track.artist || '',
        contract_scan_ref: track.contract_scan_ref || '',
        is_anomaly: !!track.is_anomaly,
        anomaly_type: track.anomaly_type || '',
        current_note: track.current_note || '',
        current_source: track.current_source || 'manual',
        operator: '',
        source_ref: '',
      })
    }
  }, [track])

  const set = (k, v) => setForm({ ...form, [k]: v })

  const submit = () => {
    if (!form.filename || !form.track_name) {
      alert('请填写文件名和曲目名称')
      return
    }
    onSave(form)
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{track ? '编辑曲目 / 修改备注' : '新增曲目记录'}</span>
          <button className="link-btn" onClick={onClose}>关闭</button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label>文件名 *</label>
              <input value={form.filename} onChange={(e) => set('filename', e.target.value)} placeholder="如 01_序曲.wav" />
            </div>
            <div className="field">
              <label>曲目名称 *</label>
              <input value={form.track_name} onChange={(e) => set('track_name', e.target.value)} placeholder="合同曲目表上的名称" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>曲目编号</label>
              <input value={form.track_no} onChange={(e) => set('track_no', e.target.value)} placeholder="如 01 / A3" />
            </div>
            <div className="field">
              <label>艺人 / 演奏者</label>
              <input value={form.artist} onChange={(e) => set('artist', e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>合同扫描件定位</label>
              <input value={form.contract_scan_ref} onChange={(e) => set('contract_scan_ref', e.target.value)} placeholder="如 扫描件1_第3行" />
            </div>
            <div className="field">
              <label>异常类型</label>
              <select value={form.anomaly_type} onChange={(e) => set('anomaly_type', e.target.value)}>
                <option value="">- 无 / 待判定 -</option>
                <option value="filename_mismatch">文件名与曲目表对不上</option>
                <option value="missing">曲目表有，文件缺失</option>
                <option value="extra">文件多出，曲目表无</option>
                <option value="other">其他异常</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>是否异常</label>
              <label className="checkbox">
                <input type="checkbox" checked={form.is_anomaly} onChange={(e) => set('is_anomaly', e.target.checked)} />
                标记为异常（鼓组节拍异常提醒）
              </label>
            </div>
            <div className="field">
              <label>本次修改来源</label>
              <select value={form.current_source} onChange={(e) => set('current_source', e.target.value)}>
                <option value="contract">合同扫描件</option>
                <option value="manual">后补备注</option>
                <option value="verbal">口头说明</option>
                <option value="system">系统识别</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>鼓组节拍异常提醒 - 备注内容</label>
            <textarea value={form.current_note} onChange={(e) => set('current_note', e.target.value)}
              placeholder="写清楚和合同哪里对不上，或者改了什么口径" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>操作人</label>
              <input value={form.operator} onChange={(e) => set('operator', e.target.value)} placeholder="你的名字，用于修改留痕" />
            </div>
            <div className="field">
              <label>材料位置（来源参考）</label>
              <input value={form.source_ref} onChange={(e) => set('source_ref', e.target.value)} placeholder="如 扫描件第5行 / 后补备注2号" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={submit}>保存并同步</button>
        </div>
      </div>
    </div>
  )
}
