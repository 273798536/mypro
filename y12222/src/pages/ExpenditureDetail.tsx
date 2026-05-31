import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, User, FileText, Receipt, CheckSquare, MessageSquare, Clock, Eye, AlertTriangle } from 'lucide-react'

export default function ExpenditureDetail() {
  const { id } = useParams<{ id: string }>()
  const { currentTrace, fetchTrace, loading } = useAppStore()
  const [activeTab, setActiveTab] = useState<'raw' | 'result'>('raw')

  useEffect(() => {
    if (id) fetchTrace(id)
  }, [id, fetchTrace])

  if (loading) return <div className="flex items-center justify-center h-64">加载中...</div>
  if (!currentTrace) return <div className="text-center py-12 text-slate-400">未找到数据</div>

  const { expenditure, invoices, approvals, opinions, delays, disclosures, anomalies } = currentTrace

  const formatMoney = (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN')

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      draft: { color: 'bg-slate-100 text-slate-700', text: '草稿' },
      pending_review: { color: 'bg-blue-100 text-blue-700', text: '待审核' },
      reviewing: { color: 'bg-amber-100 text-amber-700', text: '审核中' },
      approved: { color: 'bg-green-100 text-green-700', text: '已通过' },
      rejected: { color: 'bg-red-100 text-red-700', text: '已驳回' },
      delayed: { color: 'bg-orange-100 text-orange-700', text: '已延期' }
    }
    const style = map[status] || map.draft
    return <span className={`px-2 py-1 rounded text-xs font-medium ${style.color}`}>{style.text}</span>
  }

  const hasAnomalies = anomalies.duplicates.length > 0 || anomalies.missing_pages.length > 0 || anomalies.delays.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/expenditures" className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
          <ArrowLeft size={18} />
          返回列表
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{expenditure.title}</h1>
            <p className="text-slate-500 mt-1">{expenditure.project_name}</p>
          </div>
          <div className="flex items-center gap-3">
            {expenditure.status === 'delayed' && <AlertTriangle size={20} className="text-orange-500" />}
            {getStatusBadge(expenditure.status)}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <FileText size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">申请金额</p>
              <p className="text-lg font-semibold text-slate-900">{formatMoney(expenditure.amount)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <User size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">申请人</p>
              <p className="text-lg font-semibold text-slate-900">{expenditure.applicant}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Calendar size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">创建时间</p>
              <p className="text-lg font-semibold text-slate-900">{formatDate(expenditure.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Receipt size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">关联发票</p>
              <p className="text-lg font-semibold text-slate-900">{invoices.length} 张</p>
            </div>
          </div>
        </div>

        {expenditure.description && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 mb-2">申请说明</h3>
            <p className="text-slate-700">{expenditure.description}</p>
          </div>
        )}
      </div>

      {hasAnomalies && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-800 flex items-center gap-2 mb-4">
            <AlertTriangle size={20} />
            异常情况
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {anomalies.duplicates.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-amber-100">
                <p className="text-sm text-amber-600 font-medium">重复发票</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{anomalies.duplicates.length} 张</p>
              </div>
            )}
            {anomalies.missing_pages.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-amber-100">
                <p className="text-sm text-amber-600 font-medium">审批缺页</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{anomalies.missing_pages.length} 条</p>
              </div>
            )}
            {anomalies.delays.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-amber-100">
                <p className="text-sm text-amber-600 font-medium">项目延期</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{anomalies.delays.length} 项</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'raw'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            原始材料
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'result'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            处理结果
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'raw' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Receipt size={16} className="text-slate-500" />
                  发票记录
                </h3>
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{inv.invoice_number}</p>
                        <p className="text-sm text-slate-500">{inv.vendor} · {inv.invoice_date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">{formatMoney(inv.amount)}</span>
                        {inv.is_duplicate && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">重复</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && <p className="text-slate-400 text-sm">暂无发票</p>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} className="text-slate-500" />
                  居民意见
                </h3>
                <div className="space-y-2">
                  {opinions.map((op) => (
                    <div key={op.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">{op.resident_name}</span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          {op.source_type === 'onsite' ? '现场' : op.source_type === 'written' ? '书面' : '线上'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{op.opinion}</p>
                    </div>
                  ))}
                  {opinions.length === 0 && <p className="text-slate-400 text-sm">暂无居民意见</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'result' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckSquare size={16} className="text-slate-500" />
                  审批流程
                </h3>
                <div className="space-y-2">
                  {approvals.map((ap) => (
                    <div key={ap.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ap.status === 'approved' ? 'bg-green-100' :
                        ap.status === 'page_missing' ? 'bg-orange-100' :
                        ap.status === 'rejected' ? 'bg-red-100' : 'bg-slate-200'
                      }`}>
                        {ap.status === 'approved' ? <CheckSquare size={16} className="text-green-600" /> :
                         ap.status === 'page_missing' ? <AlertTriangle size={16} className="text-orange-600" /> :
                         ap.status === 'rejected' ? <AlertTriangle size={16} className="text-red-600" /> :
                         <Clock size={16} className="text-slate-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">第{ap.step_order}级 · {ap.approver}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            ap.status === 'approved' ? 'bg-green-100 text-green-700' :
                            ap.status === 'page_missing' ? 'bg-orange-100 text-orange-700' :
                            ap.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ap.status === 'approved' ? '已通过' :
                             ap.status === 'page_missing' ? '缺页待补' :
                             ap.status === 'rejected' ? '已驳回' : '待审批'}
                          </span>
                        </div>
                        {ap.comments && <p className="text-sm text-slate-500 mt-1">{ap.comments}</p>}
                      </div>
                    </div>
                  ))}
                  {approvals.length === 0 && <p className="text-slate-400 text-sm">暂无审批记录</p>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-slate-500" />
                  延期记录
                </h3>
                <div className="space-y-2">
                  {delays.map((d) => (
                    <div key={d.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-orange-800">
                          {d.original_deadline} → {d.new_deadline}
                        </span>
                      </div>
                      <p className="text-sm text-orange-700">原因：{d.reason}</p>
                      {d.impact_description && (
                        <p className="text-sm text-orange-600 mt-1">影响：{d.impact_description}</p>
                      )}
                    </div>
                  ))}
                  {delays.length === 0 && <p className="text-slate-400 text-sm">暂无延期记录</p>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Eye size={16} className="text-slate-500" />
                  公示状态
                </h3>
                <div className="space-y-2">
                  {disclosures.map((d) => (
                    <div key={d.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">{d.disclosure_date} 至 {d.end_date}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          d.status === 'published' ? 'bg-green-100 text-green-700' :
                          d.status === 'ended' ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {d.status === 'published' ? '公示中' : d.status === 'ended' ? '已结束' : '草稿'}
                        </span>
                      </div>
                      {d.public_notice_content && (
                        <p className="text-sm text-slate-600">{d.public_notice_content}</p>
                      )}
                    </div>
                  ))}
                  {disclosures.length === 0 && <p className="text-slate-400 text-sm">暂无公示记录</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
