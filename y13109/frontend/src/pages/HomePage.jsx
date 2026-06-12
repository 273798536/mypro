import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { batchAPI } from '../api/index.js'
import CreateBatchModal from '../components/CreateBatchModal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

export default function HomePage() {
  const [batches, setBatches] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    try {
      const res = await batchAPI.list()
      setBatches(res.data)
    } catch (e) {
      console.error('加载批次失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (name, threshold) => {
    try {
      const res = await batchAPI.create(name, threshold)
      setBatches([res.data, ...batches])
      setShowCreateModal(false)
      navigate(`/batch/${res.data.id}`)
    } catch (e) {
      alert('创建批次失败: ' + e.message)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  return (
    <div>
      <div className="flex-between mb-20">
        <h2 style={{ fontSize: '22px' }}>批量验算批次</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + 新建批次
        </button>
      </div>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : batches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>还没有验算批次</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>点击"新建批次"开始第一次矩阵条件数批量验算</p>
          </div>
        </div>
      ) : (
        <div className="batch-list">
          {batches.map(batch => (
            <div
              key={batch.id}
              className="batch-item"
              onClick={() => navigate(`/batch/${batch.id}`)}
            >
              <div className="batch-info">
                <h3>{batch.name}</h3>
                <div className="batch-meta">
                  共 {batch.summary.total} 个矩阵 · 
                  正常 {batch.summary.normal} · 
                  越界 {batch.summary.out_of_bound} · 
                  空集合 {batch.summary.empty}
                </div>
                <div className="batch-meta" style={{ marginTop: '4px' }}>
                  创建于 {formatDate(batch.created_at)}
                </div>
              </div>
              <div className="batch-actions">
                <button
                  className="btn btn-sm btn-default"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/batch/${batch.id}/report`)
                  }}
                >
                  查看报告
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/batch/${batch.id}`)
                  }}
                >
                  详情 →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateBatchModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
