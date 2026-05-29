import { useState, useEffect } from 'react'
import {
  Download as DownloadIcon,
  FileText,
  CheckCircle2,
  Table,
  AlertTriangle,
} from 'lucide-react'
import { api } from '@/lib/api'

export default function DownloadPage() {
  const [includeBadRows, setIncludeBadRows] = useState(true)
  const [eventId, setEventId] = useState('')
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    api.getEvents().then(setEvents)
  }, [])

  const handleExport = () => {
    const url = api.exportCSV(includeBadRows, eventId || undefined)
    window.open(url, '_blank')
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">数据导出</h1>
        <p className="text-gray-400">导出发放明细CSV，供线下复核和存档</p>
      </div>

      <div className="max-w-xl">
        <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-lg">导出配置</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">选择赛事</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500"
              >
                <option value="">全部赛事</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 bg-[#0f0f1a] rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeBadRows}
                  onChange={(e) => setIncludeBadRows(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-emerald-500"
                />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    包含坏行记录
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    在CSV末尾追加坏行数据，便于统一复核（空行、缺列、格式错误等）
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Table className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">导出内容预览</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>选手姓名、名次、奖金总额、扣款、税费、税后实发</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>发放状态、银行卡尾号、来源说明</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>并列名次标记、争议标记、重发标记</span>
            </div>
            {includeBadRows && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>坏行记录（行号、错误类型、原始内容、来源）</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-lg transition-colors"
        >
          <DownloadIcon className="w-5 h-5" />
          下载 CSV 文件
        </button>
      </div>
    </div>
  )
}
