import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { StatusTag, ExceptionTypeTag } from '@/components/ui/StatusTag'
import { Clock, AlertTriangle, CheckCircle, User, MessageSquare } from 'lucide-react'

type TabType = 'pending' | 'error'

export function Exceptions() {
  const { exceptions, fetchExceptions, resolveException, loading } = useStore()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [resolveModal, setResolveModal] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  useEffect(() => {
    fetchExceptions({ 
      severity: activeTab === 'pending' ? 'PENDING' : 'ERROR',
      status: 'OPEN'
    })
  }, [fetchExceptions, activeTab])

  const handleResolve = async (id: string) => {
    await resolveException(id, {
      resolutionNote,
      shouldRecalculate: true,
    })
    setResolveModal(null)
    setResolutionNote('')
    fetchExceptions({ 
      severity: activeTab === 'pending' ? 'PENDING' : 'ERROR',
      status: 'OPEN'
    })
  }

  const filteredExceptions = exceptions.filter(e => 
    activeTab === 'pending' ? e.severity === 'PENDING' : e.severity === 'ERROR'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">异常处理中心</h1>
        <p className="text-slate-500 mt-1">处理联票拆分、退款跨场、赞助抵扣等待确认项</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'text-amber-600 border-amber-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          待确认清单
          <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
            {exceptions.filter(e => e.severity === 'PENDING' && e.status === 'OPEN').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('error')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'error'
              ? 'text-rose-600 border-rose-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          异常清单
          <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs">
            {exceptions.filter(e => e.severity === 'ERROR' && e.status !== 'RESOLVED').length}
          </span>
        </button>
      </div>

      <div className="space-y-4">
        {filteredExceptions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
            <p className="text-slate-500">暂无{activeTab === 'pending' ? '待确认' : '异常'}项</p>
          </div>
        ) : (
          filteredExceptions.map((exception) => (
            <div
              key={exception.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ExceptionTypeTag type={exception.type} />
                    <StatusTag status={exception.status} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {exception.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-3">{exception.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(exception.createdAt).toLocaleString('zh-CN')}
                    </span>
                    {exception.assignee && (
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {exception.assignee}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResolveModal(exception.id)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    处理
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">处理异常</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">处理说明</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="请输入处理说明..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-slate-600">重新计算分账</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleResolve(resolveModal)}
                disabled={!resolutionNote}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                确认处理
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
