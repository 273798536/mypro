function SampleDetail({ sample, report, activeTab, onTabChange }) {
  const screenshotUrl = report?.screenshots?.find(s => s.sampleId === sample.id)?.url || ''

  return (
    <>
      <div className="sample-detail-header">
        <h2>
          {sample.name}
          {sample.anomalyType === 'direction' && (
            <span className="badge warning" style={{ marginLeft: 10 }}>方向符号异常</span>
          )}
          {sample.isBoundary && (
            <span className="badge caution" style={{ marginLeft: 10 }}>边界样本</span>
          )}
          {sample.hasUnitIssue && (
            <span className="badge info" style={{ marginLeft: 10 }}>单位已统一</span>
          )}
        </h2>
        <span className="badge" style={{ 
          background: sample.isNormal ? '#c6f6d5' : '#fed7d7',
          color: sample.isNormal ? '#276749' : '#c53030'
        }}>
          {sample.isNormal ? '数据有效' : '需复核'}
        </span>
      </div>

      <div className="detail-tabs">
        <div 
          className={`detail-tab ${activeTab === 'detail' ? 'active' : ''}`}
          onClick={() => onTabChange('detail')}
        >
          详情
        </div>
        <div 
          className={`detail-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => onTabChange('notes')}
        >
          说明与记录
        </div>
        <div 
          className={`detail-tab ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => onTabChange('maintenance')}
        >
          维修与处理
        </div>
      </div>

      <div className="detail-content">
        {activeTab === 'detail' && (
          <>
            <div className="screenshot-container">
              {screenshotUrl ? (
                <img src={screenshotUrl} alt={sample.name} />
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                  暂无截图
                </div>
              )}
              <div className="screenshot-note">
                <strong>截图说明：</strong>{sample.screenshotNote}
              </div>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <div className="label">攻角</div>
                <div className="value">{sample.attackAngle}°</div>
              </div>
              <div className="info-item">
                <div className="label">流速</div>
                <div className="value">
                  {sample.windSpeed} {sample.windSpeedUnit}
                  {sample.hasUnitIssue && sample.rawWindSpeedInput && (
                    <span style={{ fontSize: 11, color: '#718096', marginLeft: 6 }}>
                      (原始: {sample.rawWindSpeedInput} {sample.rawInputUnit})
                    </span>
                  )}
                </div>
              </div>
              <div className="info-item">
                <div className="label">分离点位置</div>
                <div className="value">
                  {sample.separationPoint ? `${(sample.separationPoint * 100).toFixed(0)}% 弦长` : '无分离'}
                </div>
              </div>
              <div className="info-item">
                <div className="label">流动状态</div>
                <div className="value">{sample.flowStatus}</div>
              </div>
            </div>

            {sample.changeReason && (
              <div className="change-reason">
                <strong>📊 变化原因：</strong>{sample.changeReason}
              </div>
            )}

            {sample.boundaryNote && (
              <div className="change-reason" style={{ background: '#fffaf0', borderLeftColor: '#dd6b20' }}>
                <strong>⚠️ 边界样本说明：</strong>{sample.boundaryNote}
              </div>
            )}

            {sample.anomalyDescription && (
              <div className="change-reason" style={{ background: '#fff5f5', borderLeftColor: '#e53e3e' }}>
                <strong>❌ 异常说明：</strong>{sample.anomalyDescription}
              </div>
            )}
          </>
        )}

        {activeTab === 'notes' && (
          <div className="notes-section">
            <h4>三套说明对照</h4>
            
            <div className="note-card unified">
              <div className="note-title">✅ 统一说明</div>
              <p>{sample.unifiedNote}</p>
            </div>

            <div className="note-card">
              <div className="note-title">场景标注</div>
              <p>{sample.sceneLabel}</p>
            </div>

            <div className="note-card">
              <div className="note-title">侧边说明</div>
              <p>{sample.sideNote}</p>
            </div>

            <div className="note-card">
              <div className="note-title">截图说明</div>
              <p>{sample.screenshotNote}</p>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#f7fafc', borderRadius: 6 }}>
              <p style={{ fontSize: 12, color: '#4a5568' }}>
                <strong>说明一致性检查：</strong>
              </p>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                场景标注与侧边说明：{sample.notesConsistent?.sceneAndSide ? '✅ 一致' : '⚠️ 需核对'}
                <br />
                场景标注与截图说明：{sample.notesConsistent?.sceneAndScreenshot ? '✅ 一致' : '⚠️ 需核对'}
                <br />
                侧边说明与截图说明：{sample.notesConsistent?.sideAndScreenshot ? '✅ 一致' : '⚠️ 需核对'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="maintenance-info">
            <div className="maintenance-card">
              <h5>🔧 维修备注</h5>
              <p>{sample.maintenanceRemark || '无'}</p>
            </div>
            <div className="maintenance-card" style={{ borderTopColor: '#38a169' }}>
              <h5>📝 处理记录</h5>
              <p>{sample.processingRecord || '无'}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default SampleDetail
