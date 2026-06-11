import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'

const unitLabels: Record<string, string> = {
  meters: '米(m)',
  feet: '英尺(ft)',
  millimeters: '毫米(mm)'
}

const statusLabels: Record<string, { text: string; cls: string }> = {
  normal: { text: '正常', cls: 'status-normal' },
  warning: { text: '警告', cls: 'status-warning' },
  error: { text: '异常', cls: 'status-error' },
  pending: { text: '待处理', cls: 'status-pending' },
  suspended: { text: '已挂起', cls: 'status-suspended' }
}

const SidePanel: React.FC = () => {
  const {
    battens,
    selectedBattenId,
    updateUnifiedDescription,
    addNote,
    suspendBatten,
    confirmBatten,
    toggleSuspensionConfirm,
    toggleExportModal
  } = useAppStore()

  const [editMode, setEditMode] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [newNote, setNewNote] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [confirmUnit, setConfirmUnit] = useState<'meters' | 'feet' | 'millimeters'>('meters')
  const [confirmTeacher, setConfirmTeacher] = useState('现场李老师')

  const batten = battens.find((b) => b.id === selectedBattenId)

  if (!batten) {
    return (
      <div className="side-panel">
        <div className="panel-section">
          <div className="panel-title">吊杆说明</div>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>请从左侧剖面图中点击选择一个吊杆</p>
        </div>
      </div>
    )
  }

  const startEdit = () => {
    setEditDesc(batten.sceneAnnotation)
    setEditMode(true)
  }

  const saveEdit = () => {
    updateUnifiedDescription(batten.id, editDesc)
    setEditMode(false)
  }

  const submitNote = () => {
    if (!newNote.trim()) return
    addNote(batten.id, '调度阿宁', newNote.trim(), 'annotation')
    setNewNote('')
  }

  const handleSuspend = () => {
    if (!suspendReason.trim()) return
    suspendBatten(batten.id, suspendReason.trim(), '调度阿宁')
    setSuspendReason('')
    toggleSuspensionConfirm()
  }

  const handleConfirm = () => {
    confirmBatten(
      batten.id,
      confirmTeacher.trim() || '现场老师',
      batten.hasUnitMismatch ? confirmUnit : undefined
    )
  }

  const needsUnitSelection = batten.isSuspended && batten.hasUnitMismatch
  const canConfirm = !needsUnitSelection || (confirmUnit && confirmTeacher.trim())

  const statusInfo = statusLabels[batten.status]

  return (
    <div className="side-panel">
      <div className="panel-section">
        <div className="panel-title">
          {batten.name}
          <span className={`status-badge ${statusInfo.cls}`}>{statusInfo.text}</span>
          {batten.confirmedByTeacher && <span className="status-badge status-normal">已确认</span>}
        </div>
        <div className="info-row">
          <span className="info-label">吊杆编号</span>
          <span className="info-value">{batten.label}</span>
        </div>
        <div className="info-row">
          <span className="info-label">坐标系统</span>
          <span className="info-value">{batten.coordinateSystem}</span>
        </div>
        <div className="info-row">
          <span className="info-label">空间位置</span>
          <span className="info-value">
            X={batten.currentPosition.x} Y={batten.currentPosition.y} Z={batten.currentPosition.z}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">楼层标高</span>
          <span className="info-value">
            {batten.floorLevel} {unitLabels[batten.floorUnit]}
          </span>
        </div>
        {batten.hasUnitMismatch && (
          <div className="unit-mismatch">
            ⚠ 检测到单位混写：{batten.detectedFloorUnits.map((u) => unitLabels[u]).join(' / ')}
            <br />
            已自动挂起，请勿采信任何稳定结论，请等待现场老师确认
          </div>
        )}
        {batten.isSuspended && batten.suspensionReason && (
          <div className="suspension-banner">
            ⏸ 挂起原因：{batten.suspensionReason}
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-title" style={{ justifyContent: 'space-between' }}>
          <span>统一说明（场景/侧边/截图共用）</span>
          {!editMode ? (
            <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: '12px' }} onClick={startEdit}>
              编辑
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: '12px' }} onClick={() => setEditMode(false)}>
                取消
              </button>
              <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: '12px' }} onClick={saveEdit}>
                保存
              </button>
            </div>
          )}
        </div>
        {editMode ? (
          <textarea
            className="form-textarea"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={4}
          />
        ) : (
          <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            {batten.sceneAnnotation}
          </div>
        )}
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
          ✓ 此处内容同时作为场景标注、侧边说明和截图说明，确保换视角时三套话一致
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">操作</div>

        {needsUnitSelection && (
          <div style={{ marginBottom: '12px', padding: '12px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
              ⚠ 检测到单位混写，请现场老师确认正确单位后再解除挂起
            </div>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>现场老师姓名</label>
                <input
                  className="form-input"
                  value={confirmTeacher}
                  onChange={(e) => setConfirmTeacher(e.target.value)}
                  placeholder="请输入老师姓名"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  选择正确单位（仅显示检测到的冲突单位）
                </label>
                <select
                  className="form-select"
                  value={confirmUnit}
                  onChange={(e) => setConfirmUnit(e.target.value as any)}
                >
                  {batten.detectedFloorUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabels[unit]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#92400e' }}>
              当前标高数值：{batten.floorLevel}，确认单位后将以此数值×所选单位作为最终标高
            </div>
          </div>
        )}

        {batten.isSuspended && !batten.hasUnitMismatch && (
          <div style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>现场老师姓名</label>
            <input
              className="form-input"
              value={confirmTeacher}
              onChange={(e) => setConfirmTeacher(e.target.value)}
              placeholder="请输入老师姓名"
            />
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {batten.isSuspended ? (
            <button
              className="btn btn-warning"
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={!canConfirm ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {needsUnitSelection ? '确认单位并解除挂起' : '现场老师确认'}
            </button>
          ) : (
            <button className="btn btn-danger" onClick={toggleSuspensionConfirm}>
              挂起待确认
            </button>
          )}
          <button className="btn btn-primary" onClick={toggleExportModal}>
            导出对象
          </button>
        </div>
        {needsUnitSelection && !canConfirm && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#dc2626' }}>
            请填写老师姓名并选择正确单位后才能确认
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-title">添加备注</div>
        <textarea
          className="form-textarea"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="调度阿宁输入备注内容，将追加到历史记录..."
          rows={2}
        />
        <div style={{ marginTop: '8px', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={submitNote} disabled={!newNote.trim()}>
            追加备注
          </button>
        </div>
      </div>

      <div className="panel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="panel-title">历史备注（保留所有版本）</div>
        <div className="history-timeline">
          {batten.noteHistory.slice().reverse().map((note) => (
            <div key={note.id} className={`history-item ${note.type === 'suspension' ? 'suspended' : note.type === 'system' ? 'warning' : ''}`}>
              <div className="history-time">{note.timestamp} · {note.type}</div>
              <div className="history-content">{note.content}</div>
              <div className="history-author">— {note.author}</div>
            </div>
          ))}
        </div>
      </div>

      {useAppStore.getState().showSuspensionConfirm && (
        <div className="modal-overlay" onClick={toggleSuspensionConfirm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>挂起吊杆确认</h3>
            </div>
            <div className="modal-body">
              <div className="confirmation-banner">
                挂起后此吊杆将不输出任何稳定结论，直到现场老师确认。宁可挂起也不给出假稳定结论。
              </div>
              <div className="form-group">
                <label className="form-label">挂起原因（将作为统一说明更新）</label>
                <textarea
                  className="form-textarea"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="例如：楼层单位混写，需现场老师确认..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={toggleSuspensionConfirm}>取消</button>
              <button className="btn btn-danger" onClick={handleSuspend} disabled={!suspendReason.trim()}>
                确认挂起
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SidePanel
