import { useState } from 'react'
import { batchAPI } from '../api/index.js'

export default function OverrideModal({ batchId, record, onClose, onComplete }) {
  const [newStatus, setNewStatus] = useState('normal')
  const [operator, setOperator] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const statusOptions = [
    { value: 'normal', label: '正常' },
    { value: 'out_of_bound', label: '越界' },
    { value: 'overridden', label: '人工改判' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!operator.trim()) {
      alert('请输入操作人')
      return
    }
    if (!reason.trim()) {
      alert('请输入改判原因')
      return
    }

    setSubmitting(true)
    try {
      await batchAPI.override(batchId, record.id, newStatus, operator.trim(), reason.trim())
      onComplete()
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || '未知错误'
      alert('改判失败：\n' + msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>人工改判 - {record.name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>当前状态</label>
            <div style={{ padding: '8px 0', color: '#666' }}>
              {record.status}（条件数：{record.condition_number?.toFixed(4) || '-'}）
            </div>
          </div>

          <div className="form-group">
            <label>改判为 *</label>
            <select
              className="w-100"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>操作人 *</label>
            <input
              type="text"
              className="w-100"
              value={operator}
              onChange={e => setOperator(e.target.value)}
              placeholder="例如：老叶"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>改判原因 *</label>
            <textarea
              className="w-100"
              rows="3"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="请说明改判的原因..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-warning" disabled={submitting}>
              {submitting ? '提交中...' : '确认改判'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
