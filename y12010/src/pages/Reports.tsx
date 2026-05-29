import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import {
  FileDown,
  Plus,
  Eye,
  GitBranch,
  X,
  Building2,
  Layers,
  Lock,
  Unlock,
  Clock,
  AlertTriangle,
  ChevronRight,
  CircleDot,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Shield,
  ScrollText,
} from 'lucide-react'

interface Report {
  id: string
  enterpriseId: string
  enterpriseName: string
  batchId: string
  batchName: string
  status: string
  totalLocked: number
  totalReleased: number
  pendingRelease: number
  delayedRelease: number
  overdueCount: number
  generatedAt: string
}

interface MarginRecord {
  id: string
  orderId: string | null
  enterpriseName: string
  amount: number
  status: string
  lockTime: string
  releaseTime: string | null
  batchName: string
}

interface TraceData {
  marginRecord: MarginRecord
  order: {
    id: string
    orderNo: string
    type: string
    status: string
    amount: number
    createdAt: string
  }
  releaseRule: {
    id: string
    name: string
    condition: string
    action: string
    triggeredAt: string | null
  }
  auditTrail: {
    id: string
    action: string
    operator: string
    timestamp: string
    detail: string
  }[]
}

function formatMoney(v: number) {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    locked: 'badge-locked',
    pending: 'badge-pending',
    released: 'badge-released',
    delayed: 'badge-delayed',
    overdue: 'badge-overdue',
    complied: 'badge-complied',
    complying: 'badge-complying',
  }
  const labelMap: Record<string, string> = {
    locked: '已锁定',
    pending: '待释放',
    released: '已释放',
    delayed: '延迟释放',
    overdue: '已逾期',
    complied: '已履约',
    complying: '履约中',
  }
  return <span className={`badge ${map[status] || 'badge-pending-order'}`}>{labelMap[status] || status}</span>
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([])
  const [showGenDialog, setShowGenDialog] = useState(false)
  const [selEnterprise, setSelEnterprise] = useState('')
  const [selBatch, setSelBatch] = useState('')
  const [generating, setGenerating] = useState(false)
  const [detailReport, setDetailReport] = useState<any>(null)
  const [detailRecords, setDetailRecords] = useState<MarginRecord[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [traceData, setTraceData] = useState<TraceData | null>(null)
  const [loadingTrace, setLoadingTrace] = useState(false)
  const [enterprises, setEnterprises] = useState<{id: string; name: string}[]>([])
  const [batches, setBatches] = useState<{id: string; name: string}[]>([])

  useEffect(() => {
    loadReports()
    loadOptions()
  }, [])

  async function loadOptions() {
    try {
      const [entRes, batchRes] = await Promise.all([
        api.dashboard.enterprises(),
        api.dashboard.batches(),
      ])
      setEnterprises(Array.isArray(entRes) ? entRes : [])
      setBatches(Array.isArray(batchRes) ? batchRes : [])
    } catch {}
  }

  async function loadReports() {
    try {
      const res = await api.reports.list()
      setReports(Array.isArray(res) ? res : (res.reports || []))
    } catch {
      setReports([])
    }
  }

  async function handleGenerate() {
    if (!selEnterprise && !selBatch) return
    setGenerating(true)
    try {
      await api.reports.generate({ enterpriseId: selEnterprise, batchId: selBatch })
      await loadReports()
      setShowGenDialog(false)
      setSelEnterprise('')
      setSelBatch('')
    } catch {
    } finally {
      setGenerating(false)
    }
  }

  async function openDetail(id: string) {
    setLoadingDetail(true)
    setDetailReport(null)
    setDetailRecords([])
    setTraceData(null)
    try {
      const res = await api.reports.get(id)
      setDetailReport(res.report || res)
      setDetailRecords(res.records || res.rows || [])
    } catch {
    } finally {
      setLoadingDetail(false)
    }
  }

  async function openTrace(reportId: string, rowId: string) {
    setLoadingTrace(true)
    setTraceData(null)
    try {
      const res = await api.reports.trace(reportId, rowId)
      setTraceData(res)
    } catch {
    } finally {
      setLoadingTrace(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FileDown className="w-6 h-6 text-teal-primary" />
            报告导出
          </h1>
          <p className="mt-1 text-sm text-slate-500">生成并导出碳配额交易保证金报告，支持链路追溯与验证</p>
        </div>
        <button
          onClick={() => setShowGenDialog(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          生成报告
        </button>
      </div>

      {showGenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowGenDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-semibold text-slate-800">生成报告</h2>
              <button onClick={() => setShowGenDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">企业选择</label>
                <select
                  value={selEnterprise}
                  onChange={(e) => setSelEnterprise(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary bg-white"
                >
                  {[{id: '', name: '全部企业'}, ...enterprises].map((ent) => (
                    <option key={ent.id} value={ent.id}>{ent.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">批次选择</label>
                <select
                  value={selBatch}
                  onChange={(e) => setSelBatch(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary bg-white"
                >
                  {[{id: '', name: '全部批次'}, ...batches].map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGenDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || (!selEnterprise && !selBatch)}
                className="px-4 py-2 rounded-lg bg-teal-primary text-white text-sm font-medium hover:bg-teal-dark transition-colors disabled:opacity-50"
              >
                {generating ? '生成中...' : '确认生成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileSearch className="w-12 h-12 mb-3" />
          <p className="text-sm">暂无报告，点击"生成报告"创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-primary" />
                    {report.enterpriseName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    {report.batchName}
                    <span className="ml-2"><StatusBadge status={report.status} /></span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-teal-50/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    已锁定金额
                  </div>
                  <p className="font-mono text-lg font-semibold text-teal-800">¥{formatMoney(report.totalLocked)}</p>
                </div>
                <div className="bg-emerald-50/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 mb-1">
                    <Unlock className="w-3.5 h-3.5" />
                    已释放金额
                  </div>
                  <p className="font-mono text-lg font-semibold text-emerald-800">¥{formatMoney(report.totalReleased)}</p>
                </div>
                <div className="bg-amber-50/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-amber-warn mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    待释放金额
                  </div>
                  <p className="font-mono text-lg font-semibold text-amber-800">¥{formatMoney(report.pendingRelease)}</p>
                </div>
                <div className="bg-red-50/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-red-700 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    逾期笔数
                  </div>
                  <p className="font-mono text-lg font-semibold text-red-800">{report.overdueCount}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  生成于 {report.generatedAt}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDetail(report.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-primary hover:bg-teal-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    查看详情
                  </button>
                  <button
                    onClick={() => openTrace(report.id, '')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-warn hover:bg-amber-50 transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    链路验证
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDetailReport(null); setTraceData(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-800">报告详情</h2>
                <p className="text-sm text-slate-500 mt-0.5">{detailReport.enterpriseName} · {detailReport.batchName}</p>
              </div>
              <button onClick={() => { setDetailReport(null); setTraceData(null) }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b border-slate-100 flex-shrink-0">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-0.5">已锁定金额</p>
                <p className="font-mono font-semibold text-teal-800">¥{formatMoney(detailReport.totalLocked || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-0.5">已释放金额</p>
                <p className="font-mono font-semibold text-emerald-800">¥{formatMoney(detailReport.totalReleased || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-0.5">待释放金额</p>
                <p className="font-mono font-semibold text-amber-800">¥{formatMoney(detailReport.pendingRelease || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-0.5">逾期笔数</p>
                <p className="font-mono font-semibold text-red-800">{detailReport.overdueCount || 0}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">加载中...</div>
              ) : detailRecords.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">暂无保证金记录</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">订单号</th>
                      <th className="pb-2 font-medium">企业</th>
                      <th className="pb-2 font-medium">批次</th>
                      <th className="pb-2 font-medium text-right">金额</th>
                      <th className="pb-2 font-medium">状态</th>
                      <th className="pb-2 font-medium">锁定时间</th>
                      <th className="pb-2 font-medium">释放时间</th>
                      <th className="pb-2 font-medium text-center">追溯</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRecords.map((rec) => (
                      <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 font-mono text-xs text-slate-700">{rec.orderId || '-'}</td>
                        <td className="py-2.5 text-slate-700">{rec.enterpriseName}</td>
                        <td className="py-2.5 text-slate-600">{rec.batchName}</td>
                        <td className="py-2.5 font-mono text-right text-slate-800">¥{formatMoney(rec.amount)}</td>
                        <td className="py-2.5"><StatusBadge status={rec.status} /></td>
                        <td className="py-2.5 text-slate-500 text-xs">{rec.lockTime}</td>
                        <td className="py-2.5 text-slate-500 text-xs">{rec.releaseTime || '-'}</td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => openTrace(detailReport.id, rec.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-warn hover:bg-amber-50 transition-colors"
                            title="链路追溯"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {traceData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setTraceData(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-amber-warn" />
                  链路追溯验证
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  订单 {traceData.order?.orderNo || traceData.marginRecord?.orderId} 完整链路
                </p>
              </div>
              <button onClick={() => setTraceData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loadingTrace ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">追溯中...</div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-start gap-0 overflow-x-auto pb-4">
                    <div className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center w-44">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mb-2">
                          <Building2 className="w-5 h-5 text-teal-700" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 mb-1">企业账户</span>
                        <span className="text-xs text-slate-500 text-center">{traceData.marginRecord?.enterpriseName || '-'}</span>
                      </div>
                      <div className="flex items-center mx-1 mt-[-20px]">
                        <ArrowRight className="w-5 h-5 text-slate-300" />
                        <ChevronRight className="w-4 h-4 text-slate-300 -ml-1" />
                      </div>
                    </div>

                    <div className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center w-44">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                          <Lock className="w-5 h-5 text-amber-700" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 mb-1">保证金锁定</span>
                        <span className="text-xs text-slate-500 text-center">
                          ¥{formatMoney(traceData.marginRecord?.amount || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{traceData.marginRecord?.lockTime || '-'}</span>
                      </div>
                      <div className="flex items-center mx-1 mt-[-20px]">
                        <ArrowRight className="w-5 h-5 text-slate-300" />
                        <ChevronRight className="w-4 h-4 text-slate-300 -ml-1" />
                      </div>
                    </div>

                    <div className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center w-44">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                          <ScrollText className="w-5 h-5 text-blue-700" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 mb-1">交易订单</span>
                        <span className="text-xs text-slate-500 text-center">{traceData.order?.orderNo || '-'}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {traceData.order?.type || '-'} · <StatusBadge status={traceData.order?.status || 'pending'} />
                        </span>
                      </div>
                      <div className="flex items-center mx-1 mt-[-20px]">
                        <ArrowRight className="w-5 h-5 text-slate-300" />
                        <ChevronRight className="w-4 h-4 text-slate-300 -ml-1" />
                      </div>
                    </div>

                    <div className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center w-44">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mb-2">
                          <Shield className="w-5 h-5 text-violet-700" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 mb-1">释放规则</span>
                        <span className="text-xs text-slate-500 text-center">{traceData.releaseRule?.name || '-'}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{traceData.releaseRule?.condition || '-'}</span>
                      </div>
                      <div className="flex items-center mx-1 mt-[-20px]">
                        <ArrowRight className="w-5 h-5 text-slate-300" />
                        <ChevronRight className="w-4 h-4 text-slate-300 -ml-1" />
                      </div>
                    </div>

                    <div className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center w-44">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                          <FileDown className="w-5 h-5 text-emerald-700" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 mb-1">报告导出</span>
                        <span className="text-xs text-slate-500 text-center">报告已生成</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">链路验证通过</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      审计轨迹
                    </h3>
                    <div className="space-y-2">
                      {traceData.auditTrail?.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-start gap-3 text-sm">
                          <div className="flex flex-col items-center mt-1">
                            <CircleDot className="w-3 h-3 text-teal-primary flex-shrink-0" />
                            {idx < (traceData.auditTrail?.length || 0) - 1 && (
                              <div className="w-px h-6 bg-slate-200 mt-0.5" />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{item.action}</span>
                              <span className="text-xs text-slate-400">{item.operator}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.timestamp}</p>
                          </div>
                        </div>
                      ))}
                      {(!traceData.auditTrail || traceData.auditTrail.length === 0) && (
                        <p className="text-xs text-slate-400 py-2">暂无审计记录</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
