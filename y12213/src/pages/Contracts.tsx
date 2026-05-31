import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../store'
import { api } from '../api'
import ExtendDialog from '../components/ExtendDialog'
import QuotaDialog from '../components/QuotaDialog'
import { FileText, AlertOctagon, Clock, Ban, History } from 'lucide-react'
import type { Contract, History as HistoryType } from '../types'

export default function Contracts() {
  const { contracts, loading, error, fetchContracts, extendContract, updateContractQuota, clearError } = useStore()
  const [supplierFilter, setSupplierFilter] = useState('')
  const [extendTarget, setExtendTarget] = useState<Contract | null>(null)
  const [quotaTarget, setQuotaTarget] = useState<Contract | null>(null)
  const [historyTarget, setHistoryTarget] = useState<string | null>(null)
  const [contractHistories, setContractHistories] = useState<HistoryType[]>([])
  const [extendError, setExtendError] = useState<string | null>(null)

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  const handleExtend = useCallback(
    async (extendDays: number, reason: string, operator: string) => {
      if (!extendTarget) return
      setExtendError(null)
      const ok = await extendContract(extendTarget.id, extendDays, reason, operator)
      if (ok) {
        setExtendTarget(null)
        fetchContracts(supplierFilter || undefined)
      } else {
        const storeError = useStore.getState().error
        if (storeError) {
          setExtendError(storeError)
        }
      }
    },
    [extendTarget, extendContract, fetchContracts, supplierFilter]
  )

  const handleQuotaUpdate = useCallback(
    async (newAmount: number, reason: string, operator: string) => {
      if (!quotaTarget) return
      await updateContractQuota(quotaTarget.id, newAmount, reason, operator)
      setQuotaTarget(null)
      fetchContracts(supplierFilter || undefined)
    },
    [quotaTarget, updateContractQuota, fetchContracts, supplierFilter]
  )

  const handleViewHistory = useCallback(async (contractId: string) => {
    if (historyTarget === contractId) {
      setHistoryTarget(null)
      setContractHistories([])
      return
    }
    setHistoryTarget(contractId)
    try {
      const h = await api.histories.list({ targetType: 'contract', targetId: contractId })
      setContractHistories(h)
    } catch {
      setContractHistories([])
    }
  }, [historyTarget])

  const getGuaranteeStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
            <AlertOctagon size={12} /> 保函过期
          </span>
        )
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white">
            <Clock size={12} /> 即将到期
          </span>
        )
      case 'valid':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-800 text-green-200">保函有效</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-300">无保函</span>
    }
  }

  const getRowClass = (c: Contract) => {
    if (c.guarantee_status === 'expired' && c.extend_count > 0) return 'bg-red-950/50 border-l-4 border-l-red-600'
    if (c.guarantee_status === 'expired') return 'bg-red-950/30 border-l-4 border-l-red-600'
    if (c.guarantee_status === 'expiring_soon') return 'bg-orange-950/20 border-l-4 border-l-orange-500'
    return 'border-l-4 border-l-transparent'
  }

  const supplierOptions = [...new Set(contracts.map((c) => c.supplier_name))].sort()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-100">采购合同管理</h2>
        <p className="text-sm text-zinc-500 mt-1">采购合同与保函关联管理，合同延期记录留痕</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded text-sm text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 text-xs">关闭</button>
        </div>
      )}

      {extendError && (
        <div className="mb-4 p-4 bg-red-950/60 border-2 border-red-700 rounded-lg text-sm text-red-200 flex items-start gap-3">
          <Ban size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-300 mb-1">合同延期被拦截</p>
            <p>{extendError}</p>
            <p className="text-xs text-red-400 mt-2">请在预警清单中先处理保函续期，再进行合同延期操作。</p>
          </div>
          <button onClick={() => setExtendError(null)} className="text-red-400 hover:text-red-300 text-xs shrink-0">关闭</button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <FileText size={14} className="text-zinc-500" />
        <select
          value={supplierFilter}
          onChange={(e) => {
            setSupplierFilter(e.target.value)
            fetchContracts(e.target.value || undefined)
          }}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          <option value="">全部供应商</option>
          {supplierOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">合同编号</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">供应商</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">保函状态</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">保函编号</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">保函金额</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">到期日</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">额度占用</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">延期</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-zinc-500">加载中...</td>
                </tr>
              )}
              {contracts.map((c) => (
                <>
                  <tr key={c.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${getRowClass(c)}`}>
                    <td className="px-3 py-2.5 text-zinc-200 font-mono text-xs">{c.contract_no}</td>
                    <td className="px-3 py-2.5 text-zinc-200">{c.supplier_name}</td>
                    <td className="px-3 py-2.5">{getGuaranteeStatusBadge(c.guarantee_status)}</td>
                    <td className="px-3 py-2.5 text-zinc-400 font-mono text-xs">
                      {c.guarantee_no || <span className="text-red-400 italic">缺失</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">
                      {c.guarantee_amount ? `¥${c.guarantee_amount.toLocaleString()}` : <span className="text-red-400 italic">缺失</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300 text-xs">{c.guarantee_expiry_date || <span className="text-red-400 italic">缺失</span>}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-300">{(c.quota_used / 10000).toFixed(1)}万/{(c.quota_total / 10000).toFixed(1)}万</span>
                        {c.quota_manually_modified && (
                          <span className="text-amber-400 font-bold text-[10px]" title="额度已被人工修改">★</span>
                        )}
                      </div>
                      <div className="mt-0.5 w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.quota_used / c.quota_total > 0.8 ? 'bg-red-500' : c.quota_manually_modified ? 'bg-amber-500' : 'bg-zinc-500'}`}
                          style={{ width: `${Math.min(100, (c.quota_used / c.quota_total) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {c.extend_count > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300 font-medium">{c.extend_count}次</span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExtendTarget(c)}
                          className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            c.extend_blocked
                              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800'
                              : 'text-zinc-300 border border-zinc-700 hover:bg-zinc-800'
                          }`}
                          disabled={c.extend_blocked}
                          title={c.extend_blocked ? '保函已过期，不可延期' : '合同延期'}
                        >
                          延期
                        </button>
                        <button
                          onClick={() => setQuotaTarget(c)}
                          className="px-2 py-1 text-xs text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                        >
                          额度
                        </button>
                        <button
                          onClick={() => handleViewHistory(c.id)}
                          className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            historyTarget === c.id ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 border border-zinc-800 hover:bg-zinc-800'
                          }`}
                        >
                          <History size={10} /> 记录
                        </button>
                      </div>
                    </td>
                  </tr>
                  {historyTarget === c.id && contractHistories.length > 0 && (
                    <tr key={`${c.id}-history`}>
                      <td colSpan={9} className="px-4 py-3 bg-zinc-800/40">
                        <div className="space-y-1.5">
                          <p className="text-xs text-zinc-400 font-medium mb-2">操作历史</p>
                          {contractHistories.map((h) => (
                            <div key={h.id} className="flex items-start gap-3 text-xs">
                              <span className="text-zinc-600 shrink-0 w-32">{h.created_at}</span>
                              <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${
                                h.action_type === 'extend_blocked' ? 'bg-red-900/60 text-red-300' :
                                h.action_type === 'extend' ? 'bg-orange-900/60 text-orange-300' :
                                h.action_type === 'quota_modify' ? 'bg-amber-900/60 text-amber-300' :
                                'bg-zinc-700 text-zinc-300'
                              }`}>
                                {h.action_type === 'extend_blocked' ? '延期拦截' :
                                 h.action_type === 'extend' ? '延期' :
                                 h.action_type === 'quota_modify' ? '额度修改' :
                                 h.action_type}
                              </span>
                              <span className="text-zinc-400">{h.operator}</span>
                              <span className="text-zinc-300">{h.detail}</span>
                              {h.before_value && h.after_value && (
                                <span className="text-zinc-500">
                                  ({h.before_value} → {h.after_value})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <span>共 {contracts.length} 条合同记录</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block"></span> 保函过期</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block"></span> 即将到期</span>
        <span className="flex items-center gap-1"><span className="text-amber-400">★</span> 额度已人工修改</span>
        <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300 text-[10px]">N次</span> 合同延期</span>
      </div>

      {extendTarget && (
        <ExtendDialog
          open={!!extendTarget}
          contractNo={extendTarget.contract_no}
          onExtend={handleExtend}
          onCancel={() => { setExtendTarget(null); setExtendError(null) }}
        />
      )}

      {quotaTarget && (
        <QuotaDialog
          open={!!quotaTarget}
          contractNo={quotaTarget.contract_no}
          currentAmount={quotaTarget.quota_used}
          totalAmount={quotaTarget.quota_total}
          onUpdate={handleQuotaUpdate}
          onCancel={() => setQuotaTarget(null)}
        />
      )}
    </div>
  )
}
