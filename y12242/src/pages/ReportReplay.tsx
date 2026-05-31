import { useParams, useNavigate } from 'react-router-dom'
import { cases } from '@/data/cases'
import { useGameStore } from '@/store/gameStore'
import { generateReport, exportReport } from '@/utils/reportExporter'
import LinkageView from '@/components/LinkageView'
import ReplayTimeline from '@/components/ReplayTimeline'
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const trapLabels: Record<string, string> = {
  waiting_period: '等待期陷阱',
  invoice_duplicate: '发票重复',
  clause_expired: '条款过期',
}

const verdictLabels: Record<string, string> = {
  approved: '通过',
  rejected: '拒赔',
  pending_review: '待查',
}

const materialTypeLabels: Record<string, string> = {
  policyCard: '保单卡',
  medicalRecord: '病历',
  invoice: '发票',
  clause: '条款',
}

export default function ReportReplay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const judgments = useGameStore((s) => s.judgments)
  const trapHits = useGameStore((s) => s.trapHits)
  const replayEvents = useGameStore((s) => s.replayEvents)
  const completedCases = useGameStore((s) => s.completedCases)

  const caseData = cases.find((c) => c.id === id)
  const timeUsed = completedCases[id!]?.timeUsed ?? 0
  const score = completedCases[id!]?.score ?? 0

  if (!caseData || judgments.length === 0) {
    if (!caseData) {
      navigate('/')
    }
    return null
  }

  const report = generateReport(caseData, judgments, trapHits, replayEvents, timeUsed)

  const handleExport = () => {
    exportReport(report)
  }

  return (
    <div className="min-h-screen bg-[#0f1219] text-gray-100">
      <div className="flex items-center justify-between px-6 py-4 bg-[#0f1219] border-b border-gray-800">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold tracking-wide">理赔报告</h1>
        <button onClick={handleExport} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm">
          <Download size={16} />
          <span>导出报告</span>
        </button>
      </div>

      <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        <div className="max-w-6xl mx-auto space-y-6 pb-24">
          <section className="bg-[#f5f0e8] text-gray-900 rounded-lg p-5">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><FileText size={18} className="text-[#d4a843]" />报告概要</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div><span className="text-gray-500">案件编号</span><p className="font-mono">{caseData.id}</p></div>
              <div><span className="text-gray-500">案件标题</span><p>{caseData.title}</p></div>
              <div><span className="text-gray-500">审核时间</span><p>{new Date().toLocaleDateString()}</p></div>
              <div><span className="text-gray-500">用时</span><p>{Math.floor(timeUsed / 60)}分{timeUsed % 60}秒</p></div>
              <div><span className="text-gray-500">得分</span><p className="text-[#d4a843] font-bold text-lg">{score}</p></div>
            </div>
          </section>

          <section className="bg-[#f5f0e8] text-gray-900 rounded-lg p-5">
            <h2 className="text-lg font-bold mb-3">判定摘要</h2>
            <div className="space-y-2">
              {judgments.map((j, i) => {
                const isTrapHit = trapHits.some((t) => t.judgmentId === j.id)
                return (
                  <div key={i} className={`flex items-center gap-3 text-sm p-2 rounded ${isTrapHit ? 'bg-amber-100' : ''}`}>
                    <span className="font-mono text-xs text-gray-500 w-20 truncate">{j.materialId}</span>
                    <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">{materialTypeLabels[j.materialType] ?? j.materialType}</span>
                    <span className={`font-semibold ${j.verdict === 'approved' ? 'text-green-700' : j.verdict === 'rejected' ? 'text-red-700' : 'text-amber-700'}`}>
                      {verdictLabels[j.verdict] ?? j.verdict}
                    </span>
                    {j.isCorrect ? <CheckCircle size={16} className="text-green-600" /> : <XCircle size={16} className="text-red-600" />}
                    <span className="text-gray-600 flex-1 truncate">{j.reason}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="bg-[#f5f0e8] text-gray-900 rounded-lg p-5">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-600" />陷阱分析</h2>
            <div className="space-y-2">
              {caseData.traps.map((trap) => {
                const hit = trapHits.find((t) => t.trapId === trap.id)
                return (
                  <div key={trap.id} className="p-3 rounded border text-sm" style={{ borderColor: hit ? '#ef4444' : '#22c55e' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className={hit ? 'text-red-500' : 'text-green-500'} />
                      <span className="font-semibold">{trapLabels[trap.trapType] ?? trap.trapType}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded ${hit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {hit ? '已触发' : '已规避'}
                      </span>
                    </div>
                    <p className="text-gray-600">{trap.description}</p>
                    <p className="text-blue-700 mt-1 text-xs">正确处理：{trap.correctHandling}</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3 text-[#d4a843]">链路追踪</h2>
            <LinkageView linkageMap={report.linkageMap} policyCards={caseData.policyCards} medicalRecords={caseData.medicalRecords} invoices={caseData.invoices} clauses={caseData.clauses} />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3 text-[#d4a843]">回放时间轴</h2>
            <ReplayTimeline events={replayEvents} />
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0f1219] border-t border-gray-800 p-4 flex justify-center">
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#d4a843] hover:bg-amber-500 text-gray-900 font-bold px-8 py-3 rounded-lg transition">
          <Download size={18} />
          导出完整报告
        </button>
      </div>
    </div>
  )
}
