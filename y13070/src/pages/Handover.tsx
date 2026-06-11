import { Link, useLocation } from 'react-router-dom'
import { FileText, Calendar, Plus } from 'lucide-react'
import { useReviewStore } from '@/store'
import HandoverTable from '@/components/HandoverTable'
import ExportPanel from '@/components/ExportPanel'

const navTabs = [
  { path: '/', label: '空间复核' },
  { path: '/annotations', label: '批注管理' },
  { path: '/handover', label: '交接报告' },
]

const statusBadgeClass: Record<string, string> = {
  draft: 'bg-yellow-600 text-white',
  final: 'bg-green-600 text-white',
}

const statusLabel: Record<string, string> = {
  draft: '草稿',
  final: '已定稿',
}

export default function Handover() {
  const { handoverReports, addHandoverReport } = useReviewStore()
  const location = useLocation()

  const report = handoverReports[0]
  const hasReport = handoverReports.length > 0

  return (
    <div className="min-h-screen bg-[#1a2332] text-white">
      <nav className="border-b border-slate-700 bg-slate-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-1">
            {navTabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === tab.path
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {!hasReport ? (
          <div className="flex flex-col items-center justify-center py-24">
            <FileText size={48} className="mb-4 text-slate-600" />
            <p className="mb-4 text-slate-400">暂无交接报告</p>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              onClick={() => addHandoverReport('山地索道站空间复核交接报告')}
            >
              <Plus size={16} />
              创建交接报告
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">{report.title}</h1>
                  <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={14} />
                      创建日期: {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass[report.status]}`}>
                      {statusLabel[report.status]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <HandoverTable />
            </div>

            <div className="flex justify-end">
              <ExportPanel />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
