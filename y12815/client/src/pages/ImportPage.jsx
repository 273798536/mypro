import React, { useState, useEffect } from 'react'
import { api } from '../utils/api.js'

export default function ImportPage() {
  const [batches, setBatches] = useState([])
  const [activeTab, setActiveTab] = useState('import')
  const [testRecords, setTestRecords] = useState(null)
  const [duplicateCheck, setDuplicateCheck] = useState(null)
  const [importStrategy, setImportStrategy] = useState('skip')
  const [batchName, setBatchName] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    loadBatches()
  }, [])

  function loadBatches() {
    api.getBatches().then(res => setBatches(res.batches))
  }

  function generateTestRecords(type) {
    const records = []
    const baseCount = 10

    if (type === 'partial_duplicate') {
      for (let i = 0; i < baseCount; i++) {
        const isDup = i < 5
        records.push({
          imageName: isDup ? `zebrafish_${String(1001 + i).padStart(4, '0')}.jpg` : `zebrafish_${String(2001 + i).padStart(4, '0')}.jpg`,
          sampleName: isDup ? ['WT_Control', 'Mutant_A', 'WT_Treated'][i % 3] : 'Test_New_Sample',
          stage: 'Z16',
          stageName: '16细胞期',
          isBoundary: i % 3 === 0,
          boundaryExplanation: i % 3 === 0 ? '测试边界记录' : null,
          hasAnomaly: i % 4 === 0,
          anomalyDescription: i % 4 === 0 ? '测试异常' : null,
          confidence: 75 + Math.floor(Math.random() * 20),
          source: '测试导入',
          investigator: '测试-生态调查员',
          notes: `测试导入记录 ${i + 1}`,
          cultureVersion: '培养记录v3.2'
        })
      }
    } else if (type === 'all_new') {
      for (let i = 0; i < baseCount; i++) {
        records.push({
          imageName: `zebrafish_new_${String(3001 + i).padStart(4, '0')}.jpg`,
          sampleName: 'Fresh_Sample',
          stage: 'blastula-early',
          stageName: '早期囊胚',
          isBoundary: false,
          hasAnomaly: false,
          confidence: 90,
          source: '新一批培养',
          investigator: '生态调查员-新',
          notes: '全新导入测试',
          cultureVersion: '培养记录v4.0'
        })
      }
    } else if (type === 'all_duplicate') {
      for (let i = 0; i < baseCount; i++) {
        records.push({
          imageName: `zebrafish_${String(1001 + i).padStart(4, '0')}.jpg`,
          sampleName: ['WT_Control', 'Mutant_A', 'WT_Treated'][i % 3],
          stage: 'Z32',
          stageName: '32细胞期',
          isBoundary: false,
          hasAnomaly: false,
          confidence: 88,
          source: '重复导入测试',
          investigator: '测试-重复',
          notes: '这是一条重复导入的记录',
          cultureVersion: '培养记录v3.2'
        })
      }
    }

    setTestRecords(records)
    setDuplicateCheck(null)
    setImportResult(null)
    setBatchName(`测试导入-${type === 'partial_duplicate' ? '部分重复' : type === 'all_new' ? '全新数据' : '全部重复'}-${new Date().toLocaleTimeString()}`)
  }

  function handleCheckDuplicates() {
    if (!testRecords || testRecords.length === 0) return
    setIsChecking(true)
    api.checkDuplicates(testRecords).then(res => {
      setDuplicateCheck(res)
      setIsChecking(false)
    })
  }

  function handleExecuteImport() {
    if (!testRecords || testRecords.length === 0) return
    setIsImporting(true)
    api.executeImport({
      records: testRecords,
      batchName,
      strategy: importStrategy
    }).then(res => {
      setImportResult(res)
      setIsImporting(false)
      loadBatches()
    })
  }

  function handleResetData() {
    if (confirm('确定要重置所有数据吗？这将恢复到初始的48条模拟数据。')) {
      api.resetData().then(res => {
        alert(`数据已重置，当前共 ${res.recordCount} 条记录`)
        loadBatches()
        setTestRecords(null)
        setDuplicateCheck(null)
        setImportResult(null)
      })
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📥 数据导入与去重</h1>
        <p className="page-desc">支持Excel/CSV表格导入，自动检测重复记录。内置重复导入测试场景，确保工具越跑越稳。</p>
      </div>

      <div className="card">
        <div className="tabs">
          <div className={`tab ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
            导入数据
          </div>
          <div className={`tab ${activeTab === 'test' ? 'active' : ''}`} onClick={() => setActiveTab('test')}>
            测试场景
          </div>
          <div className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            导入历史
          </div>
        </div>

        {activeTab === 'import' && (
          <div>
            <div style={{ padding: 40, textAlign: 'center', border: '2px dashed #d1d5db', borderRadius: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📤</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>拖拽 Excel / CSV 文件到此处</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                支持 .xlsx, .xls, .csv 格式 · 自动检测重复记录
              </div>
              <button className="btn btn-primary" disabled>
                选择文件
              </button>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
                💡 提示：请到「测试场景」标签页体验重复导入测试
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: 14 }}>导入规范</h4>
              <div className="detail-panel">
                <ul style={{ fontSize: 13, color: '#475569', lineHeight: 2, paddingLeft: 20 }}>
                  <li>必填字段：图片名 (imageName)、样本名 (sampleName)、发育阶段 (stage)</li>
                  <li>推荐字段：来源备注、标注人、置信度、培养记录版本</li>
                  <li>去重规则：按「图片名 + 样本名」组合判断重复</li>
                  <li>重复处理：可选择跳过、覆盖或标记为冲突</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div>
            <div className="card-title">🧪 重复导入测试场景</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: testRecords && duplicateCheck?.duplicateCount > 0 && duplicateCheck?.duplicateCount < 10 ? '#eff6ff' : '#fff'
                }}
                onClick={() => generateTestRecords('partial_duplicate')}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>部分重复</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  10条记录，其中5条与现有数据重复
                </div>
              </div>
              <div
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: testRecords && duplicateCheck?.duplicateCount === 0 ? '#f0fdf4' : '#fff'
                }}
                onClick={() => generateTestRecords('all_new')}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>全新数据</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  10条全新记录，无任何重复
                </div>
              </div>
              <div
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: testRecords && duplicateCheck?.duplicateCount === 10 ? '#fef2f2' : '#fff'
                }}
                onClick={() => generateTestRecords('all_duplicate')}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>全部重复</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  10条全部重复，验证去重逻辑
                </div>
              </div>
            </div>

            {testRecords && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14 }}>待导入数据预览（{testRecords.length} 条）</h4>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleCheckDuplicates}
                    disabled={isChecking}
                  >
                    {isChecking ? '检测中...' : '🔍 检测重复'}
                  </button>
                </div>

                <div className="table-container" style={{ marginBottom: 20 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>图片名</th>
                        <th>样本名</th>
                        <th>标注阶段</th>
                        <th>置信度</th>
                        <th>标注人</th>
                        <th>来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testRecords.map((rec, idx) => (
                        <tr key={idx} style={{
                          background: duplicateCheck?.duplicates.some(d => d.importIndex === idx) ? '#fef2f2' : undefined
                        }}>
                          <td>{rec.imageName}</td>
                          <td>{rec.sampleName}</td>
                          <td>{rec.stageName}</td>
                          <td>{rec.confidence}%</td>
                          <td>{rec.investigator}</td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{rec.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {duplicateCheck && (
                  <div className="detail-panel" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>
                      重复检测结果
                    </div>
                    <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: 13 }}>待导入总数：</span>
                        <span style={{ fontWeight: 600 }}>{duplicateCheck.total}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: 13 }}>重复数量：</span>
                        <span style={{ fontWeight: 600, color: duplicateCheck.duplicateCount > 0 ? '#ef4444' : '#10b981' }}>
                          {duplicateCheck.duplicateCount}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: 13 }}>新增数量：</span>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                          {duplicateCheck.total - duplicateCheck.duplicateCount}
                        </span>
                      </div>
                    </div>

                    {duplicateCheck.duplicates.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>重复记录详情：</div>
                        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                          {duplicateCheck.duplicates.map((dup, idx) => (
                            <div key={idx} style={{
                              padding: '6px 10px',
                              background: '#fef2f2',
                              borderRadius: 4,
                              fontSize: 12,
                              marginBottom: 4,
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}>
                              <span>{dup.imageName} · {dup.sampleName}</span>
                              <span style={{ color: '#94a3b8' }}>已存在于 {dup.existingImportBatch}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="filter-group">
                    <label>批次名称：</label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={e => setBatchName(e.target.value)}
                      style={{ width: 250 }}
                    />
                  </div>
                  <div className="filter-group">
                    <label>重复处理：</label>
                    <select value={importStrategy} onChange={e => setImportStrategy(e.target.value)}>
                      <option value="skip">跳过重复</option>
                      <option value="overwrite">覆盖更新</option>
                    </select>
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={handleExecuteImport}
                    disabled={isImporting || !duplicateCheck}
                  >
                    {isImporting ? '导入中...' : '✅ 确认导入'}
                  </button>
                </div>

                {importResult && (
                  <div className="detail-panel" style={{ marginTop: 16, borderColor: '#10b981', background: '#f0fdf4' }}>
                    <div style={{ fontWeight: 600, color: '#065f46', marginBottom: 8 }}>
                      ✅ 导入完成
                    </div>
                    <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#065f46' }}>
                      <div>新增记录：<strong>{importResult.imported}</strong> 条</div>
                      <div>更新记录：<strong>{importResult.updated}</strong> 条</div>
                      <div>跳过重复：<strong>{importResult.skipped}</strong> 条</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>🧹 重置测试数据</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    将所有数据恢复到初始状态，用于重复测试导入流程
                  </div>
                </div>
                <button className="btn btn-outline" onClick={handleResetData}>
                  重置数据
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>批次名称</th>
                    <th>导入时间</th>
                    <th>记录数</th>
                    <th>来源</th>
                    <th>文件名</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(batch => (
                    <tr key={batch.id}>
                      <td style={{ fontWeight: 500 }}>{batch.name}</td>
                      <td style={{ color: '#64748b' }}>{batch.importTime}</td>
                      <td>{batch.recordCount}</td>
                      <td>{batch.source === 'file' ? '文件导入' : '手动录入'}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{batch.fileName}</td>
                      <td>
                        <span className={`badge ${batch.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                          {batch.status === 'completed' ? '已完成' : '处理中'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
