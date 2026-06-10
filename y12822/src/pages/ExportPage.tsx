import { useEffect, useState } from 'react'
import { useOffTargetStore } from '@/store/offTargetStore'
import { Download, FileText, FileJson } from 'lucide-react'

export default function ExportPage() {
  const store = useOffTargetStore()
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [exported, setExported] = useState(false)

  useEffect(() => {
    store.initialize()
  }, [])

  const filtered = store.getFilteredCandidates()
  const hasFilters = store.filters.batchNo || store.filters.status || store.filters.negControlResult || store.filters.search || store.filters.dateRange

  const handleExport = () => {
    let content: string
    let mimeType: string
    let extension: string

    if (format === 'csv') {
      content = store.exportCSV()
      mimeType = 'text/csv;charset=utf-8'
      extension = 'csv'
    } else {
      content = store.exportJSON()
      mimeType = 'application/json;charset=utf-8'
      extension = 'json'
    }

    const blob = new Blob(['\uFEFF' + content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crispr_offtarget_candidates.${extension}`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">数据导出</h1>
        <p className="text-sm text-zinc-500 mt-1">基于当前筛选条件导出，结果与界面展示数据一致</p>
      </div>

      <div className="max-w-2xl space-y-5">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">当前筛选条件</h2>
          {hasFilters ? (
            <div className="space-y-2 text-xs">
              {store.filters.batchNo && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-20">试剂批号</span>
                  <span className="font-mono-data text-zinc-700">{store.filters.batchNo}</span>
                </div>
              )}
              {store.filters.status && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-20">状态</span>
                  <span className="text-zinc-700">
                    {store.filters.status === 'normal' ? '正常' : store.filters.status === 'anomaly' ? '异常' : '已复核'}
                  </span>
                </div>
              )}
              {store.filters.negControlResult && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-20">阴性对照</span>
                  <span className="text-zinc-700">
                    {store.filters.negControlResult === 'normal' ? '正常' : store.filters.negControlResult === 'abnormal' ? '异常' : '待定'}
                  </span>
                </div>
              )}
              {store.filters.search && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-20">搜索</span>
                  <span className="text-zinc-700">{store.filters.search}</span>
                </div>
              )}
              {store.filters.dateRange && (
                <div className="flex gap-2">
                  <span className="text-zinc-400 w-20">日期范围</span>
                  <span className="text-zinc-700">{store.filters.dateRange[0]} 至 {store.filters.dateRange[1]}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">无筛选条件，将导出全部数据</p>
          )}
          <div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
            将导出 <span className="font-medium text-zinc-700">{filtered.length}</span> 条记录
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">选择导出格式</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('csv')}
              className={`p-4 rounded-xl border-2 transition-colors text-left ${
                format === 'csv' ? 'border-teal-500 bg-teal-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <FileText className={`w-6 h-6 mb-2 ${format === 'csv' ? 'text-teal-600' : 'text-zinc-400'}`} />
              <p className={`text-sm font-medium ${format === 'csv' ? 'text-teal-700' : 'text-zinc-700'}`}>CSV</p>
              <p className="text-xs text-zinc-400 mt-1">适用于 Excel 打开，表格格式</p>
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`p-4 rounded-xl border-2 transition-colors text-left ${
                format === 'json' ? 'border-teal-500 bg-teal-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <FileJson className={`w-6 h-6 mb-2 ${format === 'json' ? 'text-teal-600' : 'text-zinc-400'}`} />
              <p className={`text-sm font-medium ${format === 'json' ? 'text-teal-700' : 'text-zinc-700'}`}>JSON</p>
              <p className="text-xs text-zinc-400 mt-1">结构化数据，适用于程序处理</p>
            </button>
          </div>
        </div>

        <button
          onClick={handleExport}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
            exported
              ? 'bg-teal-100 text-teal-700'
              : 'bg-teal-700 text-white hover:bg-teal-800'
          }`}
        >
          <Download className="w-4 h-4" />
          {exported ? '导出成功' : `导出 ${format.toUpperCase()} 文件`}
        </button>
      </div>
    </div>
  )
}
