import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Link2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useBatchStore } from '@/stores/batchStore'
import { useAnomalyStore } from '@/stores/anomalyStore'
import AnomalyTypeBadge from '@/components/AnomalyTypeBadge'

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { currentBatch, fetchBatchDetail, calculation, fetchCalculation } = useBatchStore()
  const { anomalies, fetchAnomalies } = useAnomalyStore()
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchBatchDetail(id)
      fetchCalculation(id)
      fetchAnomalies()
    }
  }, [id, fetchBatchDetail, fetchCalculation, fetchAnomalies])

  const batchAnomalies = anomalies.filter((a) => a.batchId === id)

  const handleExportPdf = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#1E293B',
        scale: 2,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`report-${currentBatch?.batchNo || id}.pdf`)
    } catch (e) {
      console.error('PDF export failed:', e)
    }
    setExporting(false)
  }

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('分享链接已复制到剪贴板')
  }

  if (!currentBatch) {
    return <div className="text-slate-500 text-center py-12">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div
        ref={reportRef}
        className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl mx-auto"
        style={{ aspectRatio: '210/297', overflow: 'auto' }}
      >
        <div className="p-8 space-y-6">
          <div className="text-center border-b border-slate-600 pb-4">
            <h1 className="text-xl font-bold text-slate-100">风洞试验升阻力曲线报告</h1>
            <div className="text-sm text-slate-400 mt-2 space-x-4">
              <span>批次号: <span className="font-mono text-slate-200">{currentBatch.batchNo}</span></span>
              <span>模型: {currentBatch.modelNo}</span>
              <span>日期: {currentBatch.testDate}</span>
              <span>风洞: {currentBatch.windTunnelNo}</span>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-3">一、升阻力曲线图</h2>
            {calculation ? (
              <div className="bg-slate-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={calculation.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="alpha" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 11 }} label={{ value: 'α (°)', position: 'insideBottomRight', offset: -5, fill: '#94A3B8' }} />
                    <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="cl" stroke="#F59E0B" strokeWidth={2} dot={false} name="Cl" />
                    <Line type="monotone" dataKey="cd" stroke="#10B981" strokeWidth={2} dot={false} name="Cd" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-6">暂无计算结果</div>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-2">二、零点修正说明</h2>
            <div className="text-sm text-slate-300 bg-slate-900 rounded-md p-3">
              {batchAnomalies.find((a) => a.zeroCorrectionSpec)
                ? batchAnomalies
                    .filter((a) => a.zeroCorrectionSpec)
                    .map((a) => a.zeroCorrectionSpec)
                    .join('；')
                : '无修正'}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-2">三、异常处理记录</h2>
            {batchAnomalies.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left text-slate-400 py-1.5 font-medium">类型</th>
                    <th className="text-left text-slate-400 py-1.5 font-medium">处理说明</th>
                    <th className="text-left text-slate-400 py-1.5 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {batchAnomalies.map((a) => (
                    <tr key={a.id} className="border-b border-slate-700/50">
                      <td className="py-1.5"><AnomalyTypeBadge type={a.type} /></td>
                      <td className="py-1.5 text-slate-300">{a.resolution || '—'}</td>
                      <td className="py-1.5 text-slate-300">{a.status === 'resolved' ? '已解决' : a.status === 'in_progress' ? '处理中' : '待处理'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-slate-500">无异常记录</div>
            )}
          </div>

          {calculation && (
            <div>
              <h2 className="text-base font-semibold text-slate-100 mb-2">四、数据表</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left text-slate-400 py-1.5 font-medium">α (°)</th>
                    <th className="text-left text-slate-400 py-1.5 font-medium">Cl</th>
                    <th className="text-left text-slate-400 py-1.5 font-medium">Cd</th>
                    <th className="text-left text-slate-400 py-1.5 font-medium">Cl/Cd</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.points.map((p, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="py-1 font-mono text-slate-300">{p.alpha}</td>
                      <td className="py-1 font-mono text-amber-400">{p.cl.toFixed(4)}</td>
                      <td className="py-1 font-mono text-emerald-400">{p.cd.toFixed(4)}</td>
                      <td className="py-1 font-mono text-slate-300">{p.cl_cd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-6 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? '导出中...' : '导出PDF'}
        </button>
        <button
          onClick={handleShareLink}
          className="flex items-center gap-1.5 border border-slate-600 text-slate-300 hover:text-amber-500 hover:border-amber-500/50 font-medium px-6 py-2 rounded-md text-sm transition-colors"
        >
          <Link2 size={14} />
          生成分享链接
        </button>
      </div>
    </div>
  )
}
