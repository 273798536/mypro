import React from 'react'
import { useAppStore } from '../store/appStore'

const viewAngleLabels: Record<string, string> = {
  front: '正视图',
  side: '侧视图',
  top: '俯视图'
}

const ScreenshotPanel: React.FC = () => {
  const { battens, selectedBattenId } = useAppStore()
  const batten = battens.find((b) => b.id === selectedBattenId)

  if (!batten) {
    return (
      <div style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>
        请先选择一个吊杆
      </div>
    )
  }

  return (
    <div className="screenshot-area">
      <div className="panel-section" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="panel-title">
          截图说明（与场景、侧边共用数据源）
        </div>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          {batten.screenshotDescription}
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
          ✓ 此处说明与左侧面板完全一致，切换视角也不会变成三套话
        </div>
      </div>

      <div className="screenshot-list">
        {batten.screenshots.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
            暂无截图记录
          </div>
        )}
        {batten.screenshots.slice().reverse().map((sc, idx) => (
          <div key={sc.id} className="screenshot-card" style={{ borderLeft: `4px solid ${idx === 0 ? '#3b82f6' : '#e5e7eb'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                版本 v{sc.version} {idx === 0 && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '6px' }}>最新</span>}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {sc.timestamp}
              </div>
            </div>

            <div className="screenshot-placeholder">
              📷 {batten.label} 截图 · {viewAngleLabels[sc.viewAngle]}
            </div>

            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              <strong style={{ color: '#374151' }}>视角：</strong>{viewAngleLabels[sc.viewAngle]}
              <span style={{ marginLeft: '12px' }}><strong style={{ color: '#374151' }}>拍摄者：</strong>{sc.author}</span>
            </div>

            <div style={{ fontSize: '13px', color: '#374151', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
              <strong>说明：</strong>{sc.description}
            </div>

            {sc.processingResult && (
              <div style={{ fontSize: '12px', color: '#166534', marginTop: '6px', background: '#dcfce7', padding: '6px 10px', borderRadius: '4px' }}>
                <strong>处理结果：</strong>{sc.processingResult}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-section" style={{ borderTop: '1px solid #e5e7eb' }}>
        <div className="panel-title">传感器原始记录追溯</div>
        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {batten.sensorRecords.map((rec, idx) => (
            <div key={rec.id} style={{ padding: '10px', background: idx === batten.sensorRecords.length - 1 ? '#eff6ff' : '#fff', borderRadius: '6px', marginBottom: '6px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                [{rec.timestamp}] {rec.source}
                {rec.hasCoordinateMismatch && (
                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '6px' }}>
                    坐标系异常
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                坐标: {rec.coordinateSystem} · 位置: X{rec.position.x} Y{rec.position.y} Z{rec.position.z}
                <br />
                <strong style={{ color: '#1f2937' }}>原始说法：</strong>{rec.originalNote}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ScreenshotPanel
