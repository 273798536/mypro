import { useEffect } from 'react'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { useAppStore } from '@/store'

const TYPE_LABELS = {
  batch_mismatch: '批号不匹配',
  boundary_unclear: '标注边界不清',
  data_missing: '数据缺失',
}

const TYPE_EXPLANATIONS = {
  batch_mismatch: '试剂批次与预期不一致，建议修改口径以修正实验参数',
  boundary_unclear: '采样地点缺失导致无法确认实验边界，根据规程需要补充地点信息或重新采样',
  data_missing: '采样地点信息缺失，需要重新采样以补全数据',
}

export default function Export() {
  const { reportPreview, fetchReportPreview, loading } = useAppStore()

  useEffect(() => {
    fetchReportPreview()
  }, [fetchReportPreview])

  const handleExport = async (format: 'pdf' | 'excel') => {
    const url = format === 'pdf' ? '/api/export/pdf' : '/api/export/excel'
    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = format === 'pdf' ? 'animal-analysis-report.pdf' : 'animal-analysis-report.xlsx'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!reportPreview) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        {loading ? '加载中...' : '暂无数据'}
      </div>
    )
  }

  const anomalyTypeMap: Record<string, { count: number; items: typeof reportPreview.anomalies.items }> = {}
  for (const item of reportPreview.anomalies.items) {
    if (!anomalyTypeMap[item.type]) anomalyTypeMap[item.type] = { count: 0, items: [] }
    anomalyTypeMap[item.type].count++
    anomalyTypeMap[item.type].items.push(item)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-title text-2xl font-semibold text-slate-800">导出报告</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <FileDown size={16} />
            导出PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet size={16} />
            导出Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm max-w-4xl mx-auto" style={{ minHeight: '800px' }}>
        <div className="p-10 border-b border-slate-100">
          <h1 className="font-title text-2xl font-bold text-slate-900 text-center">
            动物行为轨迹分析报告
          </h1>
          <p className="text-sm text-slate-400 text-center mt-2">
            生成时间：{new Date(reportPreview.generatedAt).toLocaleString('zh-CN')}
          </p>
        </div>

        <section className="p-10 border-b border-slate-100">
          <h2 className="font-title text-lg font-semibold text-slate-800 mb-4">一、数据概览</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            本报告共涵盖 <span className="font-bold">{reportPreview.records.total}</span> 条培养记录，
            其中 <span className="font-bold">{reportPreview.anomalies.total}</span> 条异常记录。
            异常类型涵盖批号不匹配、标注边界不清和数据缺失三类。
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {(Object.entries(TYPE_LABELS) as [keyof typeof TYPE_LABELS, string][]).map(
              ([type, label]) => {
                const group = anomalyTypeMap[type]
                return (
                  <div key={type} className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-slate-800">{group?.count ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                )
              }
            )}
          </div>
        </section>

        <section className="p-10 border-b border-slate-100">
          <h2 className="font-title text-lg font-semibold text-slate-800 mb-4">二、异常记录与说明</h2>
          <div className="space-y-4">
            {(Object.entries(TYPE_LABELS) as [keyof typeof TYPE_LABELS, string][]).map(
              ([type, label]) => {
                const group = anomalyTypeMap[type]
                if (!group || group.count === 0) return null
                return (
                  <div key={type} className="border border-slate-200 rounded-lg p-4">
                    <h3 className="font-medium text-slate-800 mb-2">
                      {label}（{group.count} 条）
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      {TYPE_EXPLANATIONS[type]}
                    </p>
                    <ul className="space-y-1">
                      {group.items.slice(0, 5).map((item) => (
                        <li key={item.id} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-slate-300 mt-0.5">•</span>
                          <span>
                            记录 {item.animal_id}：{item.description}
                            {item.explanation && (
                              <span className="text-slate-400 ml-1">— {item.explanation}</span>
                            )}
                          </span>
                        </li>
                      ))}
                      {group.count > 5 && (
                        <li className="text-xs text-slate-400">...还有 {group.count - 5} 条记录</li>
                      )}
                    </ul>
                  </div>
                )
              }
            )}
          </div>
        </section>

        <section className="p-10">
          <h2 className="font-title text-lg font-semibold text-slate-800 mb-4">三、分组统计</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 text-slate-600 font-medium border border-slate-200">实验组</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium border border-slate-200">总数</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium border border-slate-200">正常</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium border border-slate-200">异常</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium border border-slate-200">待复核</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium border border-slate-200">异常率</th>
              </tr>
            </thead>
            <tbody>
              {reportPreview.statistics.map((g) => (
                <tr key={g.group_name}>
                  <td className="px-4 py-2 border border-slate-200 font-medium text-slate-800">{g.group_name}</td>
                  <td className="px-4 py-2 border border-slate-200 text-right text-slate-600">{g.total}</td>
                  <td className="px-4 py-2 border border-slate-200 text-right text-emerald-600">{g.normal}</td>
                  <td className="px-4 py-2 border border-slate-200 text-right text-red-600">{g.anomaly}</td>
                  <td className="px-4 py-2 border border-slate-200 text-right text-amber-600">{g.pending_review}</td>
                  <td className="px-4 py-2 border border-slate-200 text-right font-medium">{g.anomaly_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-slate-500 mt-4">
            以上统计基于全部培养记录数据。异常率计算方式为异常记录数除以该组总记录数。
            建议优先关注异常率较高的实验组，核实试剂批号一致性并补充缺失的采样地点信息。
          </p>
        </section>
      </div>
    </div>
  )
}
