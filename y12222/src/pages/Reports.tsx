import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { FileBarChart, Download, Check, Loader2 } from 'lucide-react'

export default function Reports() {
  const { generateReport, dashboard, invoices, expenditures, approvals, delays } = useAppStore()
  const [generating, setGenerating] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '社区基金支出报告',
    date_range_start: '',
    date_range_end: '',
    project_filter: '',
    includes: {
      expenditures: true,
      invoices: true,
      duplicates: true,
      approvals: true,
      delays: true,
      disclosures: true
    }
  })

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const report = await generateReport(form)
      setReportId(report.id)
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (reportId) {
      window.open(`/api/reports/${reportId}/download`, '_blank')
    }
  }

  const duplicateCount = invoices.filter(i => i.is_duplicate).length
  const missingPageCount = approvals.filter(a => a.status === 'page_missing').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">导出报告</h1>
        <p className="text-slate-500 mt-1">生成并下载社区基金支出完整报告</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">报告配置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">报告标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">起始日期</label>
                  <input
                    type="date"
                    value={form.date_range_start}
                    onChange={(e) => setForm({ ...form, date_range_start: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">截止日期</label>
                  <input
                    type="date"
                    value={form.date_range_end}
                    onChange={(e) => setForm({ ...form, date_range_end: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">项目筛选（可选）</label>
                <input
                  type="text"
                  value={form.project_filter}
                  onChange={(e) => setForm({ ...form, project_filter: e.target.value })}
                  placeholder="输入项目名称关键词..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">包含内容</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'expenditures', label: '支出申请明细' },
                    { key: 'invoices', label: '发票记录' },
                    { key: 'duplicates', label: '重复发票说明' },
                    { key: 'approvals', label: '审批记录' },
                    { key: 'delays', label: '项目延期说明' },
                    { key: 'disclosures', label: '公示记录' }
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.includes[opt.key as keyof typeof form.includes]}
                        onChange={(e) => setForm({
                          ...form,
                          includes: { ...form.includes, [opt.key]: e.target.checked }
                        })}
                        className="w-4 h-4 text-teal-600 rounded"
                      />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-4 py-3 rounded-lg transition-colors"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <FileBarChart size={18} />}
                {generating ? '生成中...' : '生成报告'}
              </button>
            </div>
          </div>

          {reportId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Check size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">报告生成成功</h3>
                  <p className="text-sm text-green-600">报告内容已准备就绪，可下载查看</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors"
              >
                <Download size={18} />
                下载报告文件
              </button>
              <p className="text-xs text-green-600 mt-3 text-center">
                报告中关于发票记录的结论与页面显示保持一致
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">报告数据预览</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">支出申请总数</span>
                <span className="font-semibold text-slate-900">{expenditures.length} 项</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">发票总数</span>
                <span className="font-semibold text-slate-900">{invoices.length} 张</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">审批记录</span>
                <span className="font-semibold text-slate-900">{approvals.length} 条</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">项目延期</span>
                <span className="font-semibold text-slate-900">{delays.length} 项</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">异常情况汇总</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-red-700">重复发票</span>
                <span className="font-bold text-red-700">{duplicateCount} 张</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-orange-700">审批缺页</span>
                <span className="font-bold text-orange-700">{missingPageCount} 条</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                <span className="text-amber-700">项目延期</span>
                <span className="font-bold text-amber-700">{delays.length} 项</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              * 以上异常情况将自动包含在导出报告中
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-semibold text-blue-800 mb-2">导出说明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 报告格式：纯文本文件 (.txt)</li>
              <li>• 包含完整的支出数据和异常说明</li>
              <li>• 发票记录结论与页面一致</li>
              <li>• 支持打印和存档</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
