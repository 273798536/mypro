import { useState } from 'react'
import { History, Download, GitCompare } from 'lucide-react'
import { useStore } from '@/store/useStore'
import ReportModal from '@/components/ReportModal'
import type { HistoryEntry } from '@/types'

const typeConfig: Record<HistoryEntry['type'], { label: string; color: string; bg: string }> = {
  filter_change: { label: '筛选变更', color: 'text-blue-600', bg: 'bg-blue-100' },
  manual_confirm: { label: '人工确认', color: 'text-orange-600', bg: 'bg-orange-100' },
  field_supplement: { label: '现场补录', color: 'text-green-600', bg: 'bg-green-100' },
  approval: { label: '审批操作', color: 'text-[#0D7377]', bg: 'bg-teal-100' },
}

const dotColor: Record<HistoryEntry['type'], string> = {
  filter_change: 'bg-blue-500',
  manual_confirm: 'bg-orange-500',
  field_supplement: 'bg-green-500',
  approval: 'bg-[#0D7377]',
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function DiffView({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-red-50 rounded p-3">
        <div className="text-xs font-medium text-red-400 mb-2">变更前</div>
        {allKeys.map((key) => {
          const isDifferent = renderValue(before[key]) !== renderValue(after[key])
          return (
            <div key={key} className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">{key}</span>
              <span className={isDifferent ? 'text-red-500 font-medium' : 'text-gray-700'}>
                {renderValue(before[key])}
              </span>
            </div>
          )
        })}
      </div>
      <div className="bg-green-50 rounded p-3">
        <div className="text-xs font-medium text-green-500 mb-2">变更后</div>
        {allKeys.map((key) => {
          const isDifferent = renderValue(before[key]) !== renderValue(after[key])
          return (
            <div key={key} className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">{key}</span>
              <span className={isDifferent ? 'text-green-600 font-medium' : 'text-gray-700'}>
                {renderValue(after[key])}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const history = useStore((s) => s.history)
  const generateReviewReport = useStore((s) => s.generateReviewReport)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportMd, setReportMd] = useState('')

  const sorted = [...history].sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const handleExport = () => {
    setReportMd(generateReviewReport())
    setReportOpen(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <History size={24} className="text-[#0D7377]" />
          <h1 className="text-2xl font-bold text-gray-800">历史复盘</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D7377] text-white rounded-lg hover:bg-[#0a5c5f] transition-colors text-sm font-medium"
        >
          <Download size={16} />
          导出复盘报告
        </button>
      </div>

      <div className="flex gap-0">
        <div className="w-1/3">
          <div className="relative border-l-2 border-[#0D7377]/30 ml-3 pl-6 space-y-6">
            {sorted.map((entry) => {
              const cfg = typeConfig[entry.type]
              return (
                <div key={entry.id} className="relative">
                  <div
                    className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full ${dotColor[entry.type]} ring-2 ring-white`}
                  />
                  <div className="text-xs text-gray-400">{formatTimestamp(entry.timestamp)}</div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                  <div className="font-medium text-gray-800 mt-1">{entry.planName}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{entry.description}</div>
                  <div className="text-xs text-gray-400 mt-1">操作人: {entry.operator}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 ml-8">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare size={20} className="text-[#0D7377]" />
            <h2 className="text-lg font-semibold text-gray-700">变更对比</h2>
          </div>
          <div className="space-y-4">
            {sorted.map((entry) => {
              const cfg = typeConfig[entry.type]
              return (
                <div key={entry.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="font-medium text-gray-800">{entry.planName}</span>
                    <span className="text-xs text-gray-400 ml-auto">{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  <DiffView before={entry.before} after={entry.after} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="复盘报告"
        markdown={reportMd}
      />
    </div>
  )
}
