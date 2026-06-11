import React, { useState } from 'react'
import { useAppStore, mockHandoffLogs } from '../store/appStore'
import type { Batten } from '../types'

const unitLabels: Record<string, string> = {
  meters: '米(m)',
  feet: '英尺(ft)',
  millimeters: '毫米(mm)'
}

const HandoffModal: React.FC = () => {
  const { battens, showHandoffModal, toggleHandoffModal } = useAppStore()
  const [activeLogId, setActiveLogId] = useState<string>(mockHandoffLogs[0]?.id ?? '')
  const [testBattenId, setTestBattenId] = useState<string>('')

  const activeLog = mockHandoffLogs.find((l) => l.id === activeLogId)

  const getBatten = (id: string): Batten | undefined => battens.find((b) => b.id === id)

  const findOriginalFromSensor = (battenId: string) => {
    const b = getBatten(battenId)
    if (!b) return null
    return b.sensorRecords.length > 0 ? b.sensorRecords[0].originalNote : '无传感器记录'
  }

  if (!showHandoffModal) return null

  return (
    <div className="modal-overlay" onClick={toggleHandoffModal}>
      <div className="modal-content" style={{ width: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>现场交接模式</h3>
          <button className="btn btn-secondary" onClick={toggleHandoffModal} style={{ padding: '3px 10px' }}>
            关闭
          </button>
        </div>
        <div className="modal-body">
          <div className="confirmation-banner" style={{ background: '#dbeafe', borderColor: '#3b82f6', color: '#1e40af' }}>
            调度阿宁正在按普通交接方式测试：
            <br />
            ① 从传感器记录找到原始说法 &nbsp; ② 从截图说明讲清处理结果
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">选择交接记录</label>
            <select
              className="form-select"
              value={activeLogId}
              onChange={(e) => setActiveLogId(e.target.value)}
            >
              {mockHandoffLogs.map((log) => (
                <option key={log.id} value={log.id}>
                  [{log.timestamp}] {log.fromOperator} → {log.toOperator}
                </option>
              ))}
            </select>
          </div>

          {activeLog && (
            <div className="handoff-section">
              <div className="handoff-card">
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>交接摘要</div>
                <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
                  <div><strong>时间：</strong>{activeLog.timestamp}</div>
                  <div><strong>交班人：</strong>{activeLog.fromOperator}</div>
                  <div><strong>接班人：</strong>{activeLog.toOperator}</div>
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px' }}>
                    <strong>摘要：</strong>{activeLog.summary}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">点选交接中的吊杆测试追溯</label>
                <select
                  className="form-select"
                  value={testBattenId}
                  onChange={(e) => setTestBattenId(e.target.value)}
                >
                  <option value="">-- 请选择吊杆 --</option>
                  {activeLog.battenIds.map((id) => {
                    const b = getBatten(id)
                    if (!b) return null
                    return (
                      <option key={id} value={id}>
                        {b.label} - {b.name}
                      </option>
                    )
                  })}
                </select>
              </div>

              {testBattenId && getBatten(testBattenId) && (
                <>
                  <div className="handoff-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                      ① 从传感器记录找到原始说法
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
                      <div style={{ marginBottom: '6px' }}>
                        <strong>{getBatten(testBattenId)!.label}</strong> 最早传感器记录：
                      </div>
                      <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '6px', fontFamily: 'Menlo, monospace', fontSize: '12px' }}>
                        {getBatten(testBattenId)!.sensorRecords[0] && (
                          <>
                            <div>时间：{getBatten(testBattenId)!.sensorRecords[0].timestamp}</div>
                            <div>来源：{getBatten(testBattenId)!.sensorRecords[0].source}</div>
                            <div>标高：{getBatten(testBattenId)!.sensorRecords[0].floorLevel} {unitLabels[getBatten(testBattenId)!.sensorRecords[0].floorUnit]}</div>
                            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #bfdbfe' }}>
                              <strong>原始说法：</strong>{findOriginalFromSensor(testBattenId)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="handoff-card" style={{ borderLeft: '4px solid #22c55e' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
                      ② 从截图说明讲清处理结果
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
                      <div style={{ marginBottom: '6px' }}>
                        <strong>{getBatten(testBattenId)!.label}</strong> 最新截图及处理结果：
                      </div>
                      {getBatten(testBattenId)!.screenshots.length > 0 ? (
                        <>
                          {getBatten(testBattenId)!.screenshots.slice().reverse().slice(0, 2).map((sc) => (
                            <div key={sc.id} style={{ padding: '10px', background: '#f0fdf4', borderRadius: '6px', marginBottom: '8px' }}>
                              <div style={{ fontSize: '12px', color: '#166534' }}>
                                v{sc.version} · {sc.timestamp} · {sc.author}
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <strong>截图说明：</strong>{sc.description}
                              </div>
                              <div style={{ marginTop: '6px', padding: '6px 10px', background: '#dcfce7', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>处理结果：</strong>{sc.processingResult ?? '无'}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{ color: '#9ca3af' }}>无截图记录</div>
                      )}
                    </div>
                  </div>

                  <div className="handoff-card" style={{ borderLeft: '4px solid #a855f7', background: '#faf5ff' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b21a8', marginBottom: '8px' }}>
                      ③ 历史备注 · 当前状态 · 截图说明一致性核对
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: 1.8, color: '#374151' }}>
                      <div style={{ padding: '8px', background: '#fff', borderRadius: '6px', marginBottom: '6px' }}>
                        <strong>当前状态：</strong>{getBatten(testBattenId)!.status}
                        {getBatten(testBattenId)!.isSuspended && ' (已挂起待确认)'}
                      </div>
                      <div style={{ padding: '8px', background: '#fff', borderRadius: '6px', marginBottom: '6px' }}>
                        <strong>统一说明：</strong>{getBatten(testBattenId)!.sceneAnnotation}
                      </div>
                      <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
                        background: getBatten(testBattenId)!.sceneAnnotation === getBatten(testBattenId)!.screenshotDescription ? '#dcfce7' : '#fee2e2',
                        color: getBatten(testBattenId)!.sceneAnnotation === getBatten(testBattenId)!.screenshotDescription ? '#166534' : '#991b1b'
                      }}>
                        {getBatten(testBattenId)!.sceneAnnotation === getBatten(testBattenId)!.screenshotDescription
                          ? '✓ 场景标注 / 侧边说明 / 截图说明三者一致'
                          : '✗ 警告：三处说明不一致！'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={toggleHandoffModal}>关闭</button>
        </div>
      </div>
    </div>
  )
}

export default HandoffModal
