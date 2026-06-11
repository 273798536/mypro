import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { generateReport } from '@/utils/api'
import type { ReportConfig } from '@/types'

const floors = ['1层', '2层', '3层', '3层/B区']
const anomalyTypes = [
  { value: 'normal', label: '正常' },
  { value: 'flicker', label: '灯光闪烁' },
  { value: 'brightness_abnormal', label: '亮度异常' },
  { value: 'off_schedule', label: '非计划时段' },
]

export default function Reports() {
  const [config, setConfig] = useState<ReportConfig>({
    dateFrom: '',
    dateTo: '',
    floor: '',
    anomalyType: '',
    includePhotos: false,
    includeHistory: false,
  })
  const [markdown, setMarkdown] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateReport(config)
      setMarkdown(result.markdown)
    } catch {
      alert('报告生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `museum-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 h-full flex gap-6">
      <div className="w-80 shrink-0 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={18} className="text-museum-amber" />
          <h2 className="text-lg font-medium text-museum-text">报告中心</h2>
        </div>

        <div className="bg-museum-surface border border-museum-border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-xs text-museum-textMuted mb-1.5">起始日期</label>
            <input
              type="date"
              value={config.dateFrom}
              onChange={(e) => setConfig({ ...config, dateFrom: e.target.value })}
              className="w-full bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
            />
          </div>

          <div>
            <label className="block text-xs text-museum-textMuted mb-1.5">截止日期</label>
            <input
              type="date"
              value={config.dateTo}
              onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
              className="w-full bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
            />
          </div>

          <div>
            <label className="block text-xs text-museum-textMuted mb-1.5">楼层筛选</label>
            <select
              value={config.floor || ''}
              onChange={(e) => setConfig({ ...config, floor: e.target.value || undefined })}
              className="w-full bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
            >
              <option value="">全部楼层</option>
              {floors.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-museum-textMuted mb-1.5">异常类型</label>
            <select
              value={config.anomalyType || ''}
              onChange={(e) => setConfig({ ...config, anomalyType: e.target.value || undefined })}
              className="w-full bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
            >
              <option value="">全部类型</option>
              {anomalyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includePhotos}
                onChange={(e) => setConfig({ ...config, includePhotos: e.target.checked })}
                className="rounded border-museum-border bg-museum-card text-museum-amber focus:ring-museum-amber"
              />
              <span className="text-sm text-museum-text">包含照片信息</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeHistory}
                onChange={(e) => setConfig({ ...config, includeHistory: e.target.checked })}
                className="rounded border-museum-border bg-museum-card text-museum-amber focus:ring-museum-amber"
              />
              <span className="text-sm text-museum-text">包含历史记录</span>
            </label>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 rounded-lg bg-museum-amber text-museum-bg text-sm font-medium hover:bg-museum-amberDark transition-colors disabled:opacity-40"
          >
            {generating ? '生成中...' : '生成报告'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-museum-surface border border-museum-border rounded-xl h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-museum-border">
            <span className="text-sm font-medium text-museum-text">报告预览</span>
            {markdown && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-museum-card border border-museum-border text-xs text-museum-textMuted hover:text-museum-text transition-colors"
              >
                <Download size={14} />
                下载
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {markdown ? (
              <pre className="text-sm text-museum-text whitespace-pre-wrap font-mono leading-relaxed">
                {markdown}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-museum-textDim text-sm">
                配置参数后点击"生成报告"预览
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
