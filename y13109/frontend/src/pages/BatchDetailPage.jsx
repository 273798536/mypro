import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { batchAPI } from '../api/index.js'
import StatusBadge from '../components/StatusBadge.jsx'
import OverrideModal from '../components/OverrideModal.jsx'
import HistoryModal from '../components/HistoryModal.jsx'
import FileUpload from '../components/FileUpload.jsx'
import JumpAnalysis from '../components/JumpAnalysis.jsx'

export default function BatchDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [batch, setBatch] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [thresholdInput, setThresholdInput] = useState('')
  const [thresholdChanged, setThresholdChanged] = useState(false)
  const [unitChanged, setUnitChanged] = useState(false)
  const [hasLateAttachment, setHasLateAttachment] = useState(false)

  useEffect(() => {
    loadBatch()
  }, [id])

  const loadBatch = async () => {
    try {
      const res = await batchAPI.get(id)
      setBatch(res.data)
      if (res.data.threshold) {
        setThresholdInput(String(res.data.threshold))
      }
    } catch (e) {
      console.error('加载批次失败:', e)
    }
  }

  const handleUploadComplete = () => {
    setShowUpload(false)
    loadBatch()
  }

  const handleProcess = async () => {
    setProcessing(true)
    try {
      const res = await batchAPI.process(id, {
        threshold: thresholdInput ? parseFloat(thresholdInput) : undefined,
        threshold_changed: thresholdChanged,
        unit_changed: unitChanged,
        has_late_attachment: hasLateAttachment
      })
      setBatch(res.data)
    } catch (e) {
      alert('处理失败: ' + e.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleOverride = (record) => {
    setSelectedRecord(record)
    setShowOverrideModal(true)
  }

  const handleViewHistory = (record) => {
    setSelectedRecord(record)
    setShowHistoryModal(true)
  }

  const handleOverrideComplete = () => {
    setShowOverrideModal(false)
    loadBatch()
  }

  const getFilteredRecords = () => {
    if (!batch) return []
    switch (activeTab) {
      case 'normal':
        return batch.records.filter(r => r.status === 'normal')
      case 'out_of_bound':
        return batch.records.filter(r => r.status === 'out_of_bound')
      case 'empty':
        return batch.records.filter(r => r.status === 'empty')
      case 'singular':
        return batch.records.filter(r => r.status === 'singular')
      case 'overridden':
        return batch.records.filter(r => r.status === 'overridden')
      case 'jump':
        return batch.records.filter(r => r.jump_analysis?.has_jump)
      default:
        return batch.records
    }
  }

  const formatCondition = (cond) => {
    if (cond === null || cond === undefined) return '-'
    return cond.toFixed(4)
  }

  if (!batch) {
    return <div className="empty-state">加载中...</div>
  }

  const records = getFilteredRecords()

  return (
    <div>
      <div className="flex-between mb-20">
        <div>
          <button
            className="btn btn-sm btn-default"
            style={{ marginBottom: '8px' }}
            onClick={() => navigate('/')}
          >
            ← 返回列表
          </button>
          <h2 style={{ fontSize: '22px' }}>{batch.name}</h2>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-default" onClick={() => navigate(`/batch/${id}/report`)}>
            📄 查看报告
          </button>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            📁 上传文件
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card total">
          <div className="number">{batch.summary.total}</div>
          <div className="label">总计</div>
        </div>
        <div className="summary-card normal">
          <div className="number">{batch.summary.normal}</div>
          <div className="label">正常</div>
        </div>
        <div className="summary-card out_of_bound">
          <div className="number">{batch.summary.out_of_bound}</div>
          <div className="label">越界</div>
        </div>
        <div className="summary-card empty">
          <div className="number">{batch.summary.empty}</div>
          <div className="label">空集合</div>
        </div>
        <div className="summary-card singular">
          <div className="number">{batch.summary.singular}</div>
          <div className="label">奇异</div>
        </div>
        <div className="summary-card overridden">
          <div className="number">{batch.summary.overridden}</div>
          <div className="label">人工改判</div>
        </div>
      </div>

      {batch.gray_release_note && (
        <div className="card" style={{ borderLeft: '4px solid #faad14' }}>
          <h3 style={{ color: '#faad14' }}>📝 灰度发布说明</h3>
          <p style={{ marginTop: '8px' }}>{batch.gray_release_note}</p>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-16">
          <h3>批量计算</h3>
          <div className="flex gap-8">
            <div>
              <label style={{ fontSize: '13px', color: '#999', marginRight: '6px' }}>阈值</label>
              <input
                type="number"
                style={{ width: '100px' }}
                value={thresholdInput}
                onChange={e => {
                  setThresholdInput(e.target.value)
                  setThresholdChanged(true)
                }}
                placeholder="阈值"
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <input type="checkbox" checked={thresholdChanged} onChange={e => setThresholdChanged(e.target.checked)} />
              阈值调整
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <input type="checkbox" checked={unitChanged} onChange={e => setUnitChanged(e.target.checked)} />
              单位变更
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <input type="checkbox" checked={hasLateAttachment} onChange={e => setHasLateAttachment(e.target.checked)} />
              晚到附件
            </label>
            <button
              className="btn btn-success"
              onClick={handleProcess}
              disabled={processing || batch.records.length === 0}
            >
              {processing ? '计算中...' : '▶ 开始计算'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: '#999' }}>
          提示：勾选"阈值调整/单位变更/晚到附件"后，系统会在跳变分析中标记对应的原因。
        </p>
      </div>

      <div className="card">
        <div className="tab-nav">
          <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
            全部 ({batch.summary.total})
          </button>
          <button className={activeTab === 'normal' ? 'active' : ''} onClick={() => setActiveTab('normal')}>
            正常 ({batch.summary.normal})
          </button>
          <button className={activeTab === 'out_of_bound' ? 'active' : ''} onClick={() => setActiveTab('out_of_bound')}>
            越界 ({batch.summary.out_of_bound})
          </button>
          <button className={activeTab === 'empty' ? 'active' : ''} onClick={() => setActiveTab('empty')}>
            空集合 ({batch.summary.empty})
          </button>
          <button className={activeTab === 'singular' ? 'active' : ''} onClick={() => setActiveTab('singular')}>
            奇异 ({batch.summary.singular})
          </button>
          <button className={activeTab === 'overridden' ? 'active' : ''} onClick={() => setActiveTab('overridden')}>
            人工改判 ({batch.summary.overridden})
          </button>
          <button className={activeTab === 'jump' ? 'active' : ''} onClick={() => setActiveTab('jump')}>
            跳变记录
          </button>
        </div>

        {records.length === 0 ? (
          <div className="empty-state">暂无记录</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>矩阵大小</th>
                <th>条件数</th>
                <th>状态</th>
                <th>跳变分析</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td>{record.matrix.rows} × {record.matrix.cols}</td>
                  <td>{formatCondition(record.condition_number)}</td>
                  <td><StatusBadge status={record.status} /></td>
                  <td>
                    {record.jump_analysis?.has_jump ? (
                      <JumpAnalysis analysis={record.jump_analysis} />
                    ) : '-'}
                  </td>
                  <td>{record.source_file || '-'}</td>
                  <td>
                    <div className="flex gap-8">
                      <button
                        className="btn btn-sm btn-default"
                        onClick={() => handleViewHistory(record)}
                      >
                        历史
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleOverride(record)}
                      >
                        改判
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUpload && (
        <FileUpload
          batchId={id}
          onClose={() => setShowUpload(false)}
          onComplete={handleUploadComplete}
        />
      )}

      {showOverrideModal && selectedRecord && (
        <OverrideModal
          batchId={id}
          record={selectedRecord}
          onClose={() => setShowOverrideModal(false)}
          onComplete={handleOverrideComplete}
        />
      )}

      {showHistoryModal && selectedRecord && (
        <HistoryModal
          record={selectedRecord}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  )
}
