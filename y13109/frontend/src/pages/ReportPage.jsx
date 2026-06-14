import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { batchAPI } from '../api/index.js'

export default function ReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState('')
  const [batch, setBatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [reportRes, batchRes] = await Promise.all([
        batchAPI.getReport(id),
        batchAPI.get(id)
      ])
      setReport(reportRes.data)
      setBatch(batchRes.data)
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || '未知错误'
      alert('加载报告失败：\n' + msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${batch?.name || '报告'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="empty-state">加载中...</div>
  }

  return (
    <div>
      <div className="flex-between mb-20">
        <div>
          <button
            className="btn btn-sm btn-default"
            style={{ marginBottom: '8px' }}
            onClick={() => navigate(`/batch/${id}`)}
          >
            ← 返回批次详情
          </button>
          <h2 style={{ fontSize: '22px' }}>📄 验算报告</h2>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-default" onClick={loadData}>
            🔄 刷新
          </button>
          <button className="btn btn-primary" onClick={handleDownload}>
            ⬇ 下载 Markdown
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <h3>报告预览</h3>
          <div style={{ fontSize: '13px', color: '#999' }}>
            页面展示与导出文件内容完全一致
          </div>
        </div>

        <div className="markdown-preview" style={{
          padding: '24px',
          background: '#fafafa',
          borderRadius: '8px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      </div>

      <div className="card" style={{ borderLeft: '4px solid #52c41a' }}>
        <h3 style={{ color: '#52c41a' }}>💡 使用说明</h3>
        <ul style={{ marginTop: '12px', paddingLeft: '20px', lineHeight: '2' }}>
          <li>此报告为沟通导向设计，可直接用于与排班同事、数学老师的沟通</li>
          <li>报告中已将越界、空集合、奇异矩阵等异常数据单独列出，避免混入正常结果</li>
          <li>每条状态变更都有完整的溯源记录，可在批次详情页查看历史</li>
          <li>结果跳变会标注可能原因：阈值调整 / 单位变更 / 晚到附件</li>
          <li>导出的 Markdown 文件与页面显示内容完全一致</li>
        </ul>
      </div>
    </div>
  )
}
