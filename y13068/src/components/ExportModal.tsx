import React from 'react'
import { useAppStore } from '../store/appStore'

const ExportModal: React.FC = () => {
  const { battens, selectedBattenId, showExportModal, toggleExportModal, exportBattenReport } = useAppStore()
  const batten = battens.find((b) => b.id === selectedBattenId)
  const report = selectedBattenId ? exportBattenReport(selectedBattenId) : ''

  const handleDownload = () => {
    if (!batten) return
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${batten.label}-异常对象导出报告.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!showExportModal) return null

  return (
    <div className="modal-overlay" onClick={toggleExportModal}>
      <div className="modal-content" style={{ width: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            异常对象导出报告
            {batten && <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal', marginLeft: '10px' }}>
              - {batten.name} ({batten.label})
            </span>}
          </h3>
          <button className="btn btn-secondary" onClick={toggleExportModal} style={{ padding: '3px 10px' }}>
            关闭
          </button>
        </div>
        <div className="modal-body">
          <div className="confirmation-banner">
            报告中包含：空间位置、统一说明（场景/侧边/截图三者一致）、传感器原始记录追溯、历史备注、截图说明及处理结果。
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
            请核对下方内容，确认空间位置、备注和截图说明是否对得上：
          </div>
          <pre
            style={{
              background: '#1f2937',
              color: '#f9fafb',
              padding: '16px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: 'Menlo, Consolas, monospace'
            }}
          >
            {report}
          </pre>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={toggleExportModal}>取消</button>
          <button className="btn btn-primary" onClick={handleDownload}>下载报告</button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
