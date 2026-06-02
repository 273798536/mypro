import { useEffect, useState } from 'react'
import { FileText, Download, FileCheck, AlertTriangle, Link2 } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const reportTypes = [
  { key: 'settlement', label: '版税结算报告', icon: FileCheck, desc: '汇总各作品版税金额与分配明细' },
  { key: 'anomaly', label: '异常说明报告', icon: AlertTriangle, desc: '列出所有异常项及其处理说明' },
  { key: 'trace', label: '追溯链报告', icon: Link2, desc: '展示版税计算全链路追溯信息' },
]

export default function Reports() {
  const { reports, reportsLoading, fetchReports, generateReport } = useStore()
  const [selectedType, setSelectedType] = useState('settlement')
  const [period, setPeriod] = useState('')
  const [selectedWorks, setSelectedWorks] = useState('')
  const [includeAnomaly, setIncludeAnomaly] = useState(false)
  const [includeTrace, setIncludeTrace] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleGenerate = async () => {
    setGenerating(true)
    await generateReport({
      type: selectedType,
      works: selectedWorks ? selectedWorks.split(',').map((s) => s.trim()) : [],
      period,
      includeAnomaly,
      includeTrace,
    })
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>选择报告类型</h3>
        <div className="grid grid-cols-3 gap-4">
          {reportTypes.map((t) => {
            const Icon = t.icon
            const active = selectedType === t.key
            return (
              <button
                key={t.key}
                className={cn('card text-left transition-all', active && 'ring-1 ring-amber-gold')}
                style={{ borderColor: active ? 'var(--amber-gold)' : 'var(--border-color)' }}
                onClick={() => setSelectedType(t.key)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} style={{ color: active ? 'var(--amber-gold)' : 'var(--text-muted)' }} />
                  <span className="text-sm font-medium" style={{ color: active ? 'var(--amber-gold)' : 'var(--text-primary)' }}>{t.label}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card space-y-4">
        <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>报告选项</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: 'var(--text-muted)' }}>选择作品（逗号分隔ID）</label>
            <input className="input w-full" placeholder="留空则包含全部" value={selectedWorks} onChange={(e) => setSelectedWorks(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: 'var(--text-muted)' }}>报告周期</label>
            <input className="input w-full" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" className="accent-amber-gold" checked={includeAnomaly} onChange={(e) => setIncludeAnomaly(e.target.checked)} />
            包含异常说明
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" className="accent-amber-gold" checked={includeTrace} onChange={(e) => setIncludeTrace(e.target.checked)} />
            包含追溯快照
          </label>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '生成报告'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>已生成报告</h3>
        {reportsLoading ? (
          <div className="card p-5"><div className="skeleton h-20 w-full" /></div>
        ) : reports.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无报告</p>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  <th className="px-4 py-3 font-medium">报告名称</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">生成时间</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{r.title}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{r.type}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{r.createdAt}</td>
                    <td className="px-4 py-3">
                      <a
                        href={r.downloadUrl}
                        className="flex items-center gap-1 text-sm transition-colors"
                        style={{ color: 'var(--amber-gold)' }}
                      >
                        <Download size={14} /> 下载
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
