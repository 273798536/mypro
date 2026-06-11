import React, { useState, useEffect } from 'react'
import ProfileView from './components/ProfileView'
import SidePanel from './components/SidePanel'
import ScreenshotPanel from './components/ScreenshotPanel'
import ExportModal from './components/ExportModal'
import HandoffModal from './components/HandoffModal'
import { useAppStore } from './store/appStore'

const App: React.FC = () => {
  const { battens, toggleHandoffModal, toggleExportModal, selectedBattenId } = useAppStore()
  const [showScreenshotPanel, setShowScreenshotPanel] = useState(true)
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theater-batten-array-store')
      if (stored) {
        const data = JSON.parse(stored)
        const hasOldYData = data.state?.battens?.every(
          (b: any) => b.currentPosition?.y === 0
        )
        if (hasOldYData) {
          localStorage.removeItem('theater-batten-array-store')
          window.location.reload()
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const abnormalCount = battens.filter((b) => b.status === 'error' || b.status === 'suspended').length
  const warningCount = battens.filter((b) => b.status === 'warning').length
  const suspendedCount = battens.filter((b) => b.isSuspended).length

  const selectedBatten = battens.find((b) => b.id === selectedBattenId)

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎭 剧院吊杆阵列剖面讲解</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '13px', display: 'flex', gap: '12px' }}>
            <span>共 {battens.length} 条吊杆</span>
            {warningCount > 0 && <span style={{ color: '#fef3c7' }}>⚠ 警告 {warningCount}</span>}
            {abnormalCount > 0 && <span style={{ color: '#fecaca' }}>✗ 异常/挂起 {abnormalCount}</span>}
            {suspendedCount > 0 && <span style={{ color: '#e9d5ff' }}>⏸ 待确认 {suspendedCount}</span>}
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setShowScreenshotPanel((v) => !v)}>
              {showScreenshotPanel ? '隐藏截图区' : '显示截图区'}
            </button>
            <button className="btn btn-warning" onClick={toggleHandoffModal}>
              现场交接模式
            </button>
            <button
              className="btn btn-primary"
              onClick={toggleExportModal}
              disabled={!selectedBattenId}
              style={!selectedBattenId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              导出异常对象
            </button>
          </div>
        </div>
      </header>

      <div className="app-main">
        <ProfileView />
        <SidePanel />
        {showScreenshotPanel && (
          <div style={{ width: '360px', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <ScreenshotPanel />
          </div>
        )}
      </div>

      {selectedBatten && (
        <div style={{
          padding: '8px 20px',
          background: selectedBatten.isSuspended ? '#f3e8ff' : selectedBatten.hasUnitMismatch ? '#fef2f2' : '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          fontSize: '12px',
          color: selectedBatten.isSuspended ? '#6b21a8' : selectedBatten.hasUnitMismatch ? '#991b1b' : '#6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>
            {selectedBatten.isSuspended && '⏸ '}
            {selectedBatten.label}：{selectedBatten.sceneAnnotation}
          </span>
          <span>
            {selectedBatten.sceneAnnotation === selectedBatten.sideDescription && selectedBatten.sideDescription === selectedBatten.screenshotDescription
              ? '✓ 场景标注 / 侧边说明 / 截图说明三者一致'
              : '✗ 三处说明不一致，请检查'}
          </span>
        </div>
      )}

      <ExportModal />
      <HandoffModal />
    </div>
  )
}

export default App
