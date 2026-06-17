import { useState } from 'react'
import type { SeatRecord, Complaint } from '../types'
import { StatusBadge } from './StatusBadge'
import { seatService } from '../services/seatService'

interface RecordDetailProps {
  record: SeatRecord
  onClose: () => void
  onUpdate: () => void
}

export function RecordDetail({ record, onClose, onUpdate }: RecordDetailProps) {
  const [conclusion, setConclusion] = useState(record.conclusion || '')
  const [conclusionStatus, setConclusionStatus] = useState<'confirmed' | 'manual_review' | 'need_material'>(
    record.status === 'confirmed' ? 'confirmed' : record.status === 'manual_review' ? 'manual_review' : 'need_material'
  )
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([])
  const [withdrawReason, setWithdrawReason] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [materialName, setMaterialName] = useState('')
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [schemeText, setSchemeText] = useState(record.scheme)
  const [editingScheme, setEditingScheme] = useState(false)

  const handleConfirm = () => {
    seatService.confirmRecord(record.id)
    onUpdate()
  }

  const handleWithdraw = () => {
    if (!withdrawReason.trim()) return
    seatService.withdrawRecord(record.id, withdrawReason)
    setShowWithdraw(false)
    setWithdrawReason('')
    onUpdate()
  }

  const handleConclusion = () => {
    if (!conclusion.trim()) return
    seatService.setConclusion(record.id, conclusion, conclusionStatus)
    onUpdate()
  }

  const handleMerge = () => {
    if (selectedComplaints.length < 2) return
    seatService.mergeComplaints(record.id, selectedComplaints)
    setSelectedComplaints([])
    onUpdate()
  }

  const toggleComplaint = (id: string) => {
    setSelectedComplaints(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleAddMaterial = () => {
    if (!materialName.trim()) return
    seatService.addMaterial(record.id, materialName)
    setMaterialName('')
    setShowAddMaterial(false)
    onUpdate()
  }

  const handleUpdateScheme = () => {
    if (!schemeText.trim()) return
    seatService.updateScheme(record.id, schemeText)
    setEditingScheme(false)
    onUpdate()
  }

  const actionMap: Record<string, string> = {
    import: '导入',
    confirm: '确认',
    withdraw: '撤回',
    conclude: '结论',
    update_scheme: '更新方案',
    merge: '归并',
    add_material: '补充材料',
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <h2>{record.gisPoint.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="detail-body">
          <div className="detail-section">
            <div className="detail-section-header">
              <h3>基本信息</h3>
              <StatusBadge
                status={record.status}
                conflict={record.conflictInfo?.needsConfirmation}
                needMerge={record.needMerge}
              />
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">GIS点位</span>
                <span className="detail-value">{record.gisPoint.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">街口</span>
                <span className="detail-value">{record.gisPoint.street}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">经纬度</span>
                <span className="detail-value">
                  {record.gisPoint.lng.toFixed(4)}, {record.gisPoint.lat.toFixed(4)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">导入时间</span>
                <span className="detail-value">{record.importTime}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">经办人</span>
                <span className="detail-value">{record.operator}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">方案版本</span>
                <span className="detail-value">v{record.schemeVersion}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-header">
              <h3>座椅方案</h3>
              {!editingScheme && (
                <button className="link-btn" onClick={() => setEditingScheme(true)}>
                  修改方案
                </button>
              )}
            </div>
            {editingScheme ? (
              <div className="scheme-edit">
                <textarea
                  value={schemeText}
                  onChange={e => setSchemeText(e.target.value)}
                  rows={3}
                  className="text-input"
                />
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={handleUpdateScheme}>保存</button>
                  <button className="btn btn-secondary" onClick={() => { setEditingScheme(false); setSchemeText(record.scheme) }}>取消</button>
                </div>
              </div>
            ) : (
              <p className="scheme-text">{record.scheme}</p>
            )}
          </div>

          {record.conflictInfo && (
            <div className="detail-section conflict-section">
              <h3>⚠️ 冲突待确认</h3>
              <div className="conflict-box">
                <p><strong>类型：</strong>{record.conflictInfo.type === 'old_covers_new' ? '旧方案覆盖新意见' : '重复街口'}</p>
                <p><strong>原因：</strong>{record.conflictInfo.reason}</p>
                <p><strong>影响范围：</strong>{record.conflictInfo.affectedRange}</p>
              </div>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-header">
              <h3>投诉记录（{record.complaints.length} 条）</h3>
              {record.needMerge && record.complaints.length >= 2 && (
                <span className="merge-tip">💡 同一街口多条投诉，建议归并</span>
              )}
            </div>
            <div className={`complaint-list ${record.needMerge ? 'need-merge' : ''}`}>
              {record.complaints.map((cmp: Complaint) => (
                <div
                  key={cmp.id}
                  className={`complaint-item ${selectedComplaints.includes(cmp.id) ? 'selected' : ''} ${cmp.merged ? 'merged' : ''}`}
                  onClick={() => record.needMerge && toggleComplaint(cmp.id)}
                >
                  {record.needMerge && (
                    <input
                      type="checkbox"
                      checked={selectedComplaints.includes(cmp.id)}
                      onChange={() => toggleComplaint(cmp.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  <div className="complaint-content">
                    <p className="complaint-text">{cmp.content}</p>
                    <div className="complaint-meta">
                      <span>投诉人：{cmp.reporter}</span>
                      <span>{cmp.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {record.needMerge && selectedComplaints.length >= 2 && (
              <button className="btn btn-primary merge-btn" onClick={handleMerge}>
                归并选中的 {selectedComplaints.length} 条投诉
              </button>
            )}
          </div>

          <div className="detail-section">
            <div className="detail-section-header">
              <h3>材料清单（{record.materials.length} 份）</h3>
              <button className="link-btn" onClick={() => setShowAddMaterial(true)}>
                + 补充材料
              </button>
            </div>
            {showAddMaterial && (
              <div className="add-material">
                <input
                  type="text"
                  placeholder="输入材料名称"
                  value={materialName}
                  onChange={e => setMaterialName(e.target.value)}
                  className="text-input"
                />
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={handleAddMaterial}>添加</button>
                  <button className="btn btn-secondary" onClick={() => { setShowAddMaterial(false); setMaterialName('') }}>取消</button>
                </div>
              </div>
            )}
            {record.materials.length > 0 ? (
              <ul className="material-list">
                {record.materials.map((m, i) => (
                  <li key={i}>📄 {m}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">暂无材料</p>
            )}
          </div>

          <div className="detail-section">
            <h3>最后结论</h3>
            {record.conclusion ? (
              <div className="conclusion-box">
                <p>{record.conclusion}</p>
                <p className="conclusion-time">出具时间：{record.conclusionTime}</p>
              </div>
            ) : (
              <div className="conclusion-edit">
                <select
                  value={conclusionStatus}
                  onChange={e => setConclusionStatus(e.target.value as any)}
                  className="text-input"
                >
                  <option value="confirmed">已处理（通过）</option>
                  <option value="need_material">待补材料</option>
                  <option value="manual_review">人工改判</option>
                </select>
                <textarea
                  placeholder="输入结论内容..."
                  value={conclusion}
                  onChange={e => setConclusion(e.target.value)}
                  rows={3}
                  className="text-input"
                />
                <button className="btn btn-primary" onClick={handleConclusion}>
                  出具结论
                </button>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>操作历史</h3>
            <div className="history-list">
              {record.history.map(h => (
                <div key={h.id} className="history-item">
                  <span className="history-time">{h.time}</span>
                  <span className="history-action">{actionMap[h.action] || h.action}</span>
                  <span className="history-operator">{h.operator}</span>
                  <span className="history-remark">{h.remark}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-footer">
          {record.status === 'pending' && (
            <button className="btn btn-primary" onClick={handleConfirm}>
              ✓ 确认方案
            </button>
          )}
          {record.status !== 'withdrawn' && (
            <>
              {!showWithdraw ? (
                <button className="btn btn-danger" onClick={() => setShowWithdraw(true)}>
                  撤回
                </button>
              ) : (
                <div className="withdraw-input">
                  <input
                    type="text"
                    placeholder="输入撤回原因"
                    value={withdrawReason}
                    onChange={e => setWithdrawReason(e.target.value)}
                    className="text-input"
                  />
                  <button className="btn btn-danger" onClick={handleWithdraw}>确认撤回</button>
                  <button className="btn btn-secondary" onClick={() => setShowWithdraw(false)}>取消</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
