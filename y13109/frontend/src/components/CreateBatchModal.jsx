import { useState } from 'react'

export default function CreateBatchModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [threshold, setThreshold] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('请输入批次名称')
      return
    }
    onCreate(name.trim(), threshold ? parseFloat(threshold) : null)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新建验算批次</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>批次名称 *</label>
            <input
              type="text"
              className="w-100"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：6月第二周矩阵验算"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>条件数阈值（可选）</label>
            <input
              type="number"
              className="w-100"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              placeholder="超过此值判定为越界"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">创建</button>
          </div>
        </form>
      </div>
    </div>
  )
}
