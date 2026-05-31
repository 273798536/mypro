import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../store'
import { api } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'
import RemarkDialog from '../components/RemarkDialog'
import {
  Download,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Filter,
  RotateCcw,
} from 'lucide-react'
import type { Warning } from '../types'

export default function Warnings() {
  const { warnings, loading, error, fetchWarnings, confirmWarning, updateWarningRemark, clearError } = useStore()
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState('')
  const [level, setLevel] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<Warning | null>(null)
  const [remarkTarget, setRemarkTarget] = useState<Warning | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false)

  useEffect(() => {
    fetchWarnings()
  }, [fetchWarnings])

  const handleFilter = useCallback(() => {
    fetchWarnings({
      supplierId: supplierId || undefined,
      status: status || undefined,
      level: level || undefined,
    })
  }, [fetchWarnings, supplierId, status, level])

  const handleReset = useCallback(() => {
    setSupplierId('')
    setStatus('')
    setLevel('')
    fetchWarnings()
  }, [fetchWarnings])

  const handleConfirm = useCallback(
    async (operator: string) => {
      if (confirmTarget) {
        await confirmWarning(confirmTarget.id, operator)
        setConfirmTarget(null)
      }
    },
    [confirmTarget, confirmWarning]
  )

  const handleBatchConfirm = useCallback(
    async (operator: string) => {
      for (const id of selectedIds) {
        await confirmWarning(id, operator)
      }
      setSelectedIds(new Set())
      setBatchConfirmOpen(false)
      fetchWarnings({
        supplierId: supplierId || undefined,
        status: status || undefined,
        level: level || undefined,
      })
    },
    [selectedIds, confirmWarning, fetchWarnings, supplierId, status, level]
  )

  const handleRemarkSave = useCallback(
    async (remark: string, operator: string) => {
      if (remarkTarget) {
        await updateWarningRemark(remarkTarget.id, remark, operator)
        setRemarkTarget(null)
      }
    },
    [remarkTarget, updateWarningRemark]
  )

  const handleExport = useCallback(() => {
    const url = api.warnings.exportUrl({
      supplierId: supplierId || undefined,
      status: status || undefined,
      level: level || undefined,
    })
    window.open(url, '_blank')
  }, [supplierId, status, level])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === warnings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(warnings.map((w) => w.id)))
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
            <AlertOctagon size={12} /> 已过期
          </span>
        )
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white">
            <AlertTriangle size={12} /> 紧急
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-600 text-white">
            <Clock size={12} /> 预警
          </span>
        )
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-300">正常</span>
    }
  }

  const getRowClass = (w: Warning) => {
    if (w.level === 'expired') return 'bg-red-950/40 border-l-4 border-l-red-600'
    if (w.level === 'urgent') return 'bg-orange-950/20 border-l-4 border-l-orange-500'
    return 'border-l-4 border-l-transparent'
  }

  const supplierOptions = [...new Set(warnings.map((w) => w.supplier_name))].sort()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-100">保函到期预警清单</h2>
        <p className="text-sm text-zinc-500 mt-1">监控供应商保函到期情况，及时处理预警</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded text-sm text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 text-xs">关闭</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <Filter size={14} className="text-zinc-500" />
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          <option value="">全部供应商</option>
          {supplierOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          <option value="">全部状态</option>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          <option value="">全部等级</option>
          <option value="expired">已过期</option>
          <option value="urgent">紧急</option>
          <option value="warning">预警</option>
          <option value="normal">正常</option>
        </select>
        <button
          onClick={handleFilter}
          className="px-4 py-1.5 text-sm bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition-colors"
        >
          筛选
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-1.5 text-sm text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
        >
          <RotateCcw size={12} /> 重置
        </button>

        <div className="ml-auto flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setBatchConfirmOpen(true)}
              className="px-4 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
            >
              <CheckCircle size={12} /> 批量确认 ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="px-4 py-1.5 text-sm text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
          >
            <Download size={12} /> 导出报告
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === warnings.length && warnings.length > 0}
                    onChange={toggleAll}
                    className="rounded bg-zinc-800 border-zinc-600"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">预警等级</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">状态</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">供应商</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">合同编号</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">保函编号</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">保函金额</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">到期日</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">剩余天数</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">额度</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">延期</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">备注</th>
                <th className="px-3 py-3 text-left text-xs text-zinc-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-zinc-500">加载中...</td>
                </tr>
              )}
              {!loading && warnings.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-zinc-500">暂无预警记录</td>
                </tr>
              )}
              {warnings.map((w) => (
                <tr key={w.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${getRowClass(w)}`}>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(w.id)}
                      onChange={() => toggleSelect(w.id)}
                      disabled={w.status === 'confirmed'}
                      className="rounded bg-zinc-800 border-zinc-600"
                    />
                  </td>
                  <td className="px-3 py-2.5">{getLevelBadge(w.level)}</td>
                  <td className="px-3 py-2.5">
                    {w.status === 'confirmed' ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle size={12} /> 已确认
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">待确认</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-200">{w.supplier_name}</td>
                  <td className="px-3 py-2.5 text-zinc-300 font-mono text-xs">{w.contract_no}</td>
                  <td className="px-3 py-2.5 text-zinc-400 font-mono text-xs">{w.guarantee_no || <span className="text-red-400 italic">缺失</span>}</td>
                  <td className="px-3 py-2.5 text-zinc-300 text-xs">
                    {w.guarantee_amount ? `¥${w.guarantee_amount.toLocaleString()}` : <span className="text-red-400 italic">缺失</span>}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300 text-xs">{w.guarantee_expiry_date || <span className="text-red-400 italic">缺失</span>}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {w.days_left !== null && w.days_left !== undefined ? (
                      w.days_left < 0 ? (
                        <span className="text-red-400 font-bold">已过期{Math.abs(w.days_left)}天</span>
                      ) : w.days_left <= 7 ? (
                        <span className="text-orange-400 font-semibold">{w.days_left}天</span>
                      ) : (
                        <span className="text-zinc-400">{w.days_left}天</span>
                      )
                    ) : (
                      <span className="text-red-400 italic">无保函</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-300">
                        {w.quota_used !== undefined && w.quota_total !== undefined
                          ? `${(w.quota_used / 10000).toFixed(1)}万/${(w.quota_total / 10000).toFixed(1)}万`
                          : '-'}
                      </span>
                      {w.quota_manually_modified && (
                        <span className="text-amber-400 text-[10px] font-bold" title="额度已被人工修改">★</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {w.extend_count && w.extend_count > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300 font-medium">{w.extend_count}次延期</span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs max-w-[120px] truncate">
                    {w.remark ? (
                      <span className="text-zinc-300" title={w.remark}>
                        {w.remark}
                        {w.remark_modified_by && <span className="text-amber-500 ml-1" title={`由 ${w.remark_modified_by} 修改`}>✎</span>}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {w.status === 'pending' && (
                        <button
                          onClick={() => setConfirmTarget(w)}
                          className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle size={10} /> 确认
                        </button>
                      )}
                      <button
                        onClick={() => setRemarkTarget(w)}
                        className="px-2 py-1 text-xs text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
                      >
                        <MessageSquare size={10} /> 备注
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>共 {warnings.length} 条预警记录</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block"></span> 已过期</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block"></span> 紧急</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-600 inline-block"></span> 预警</span>
          <span className="flex items-center gap-1"><span className="text-amber-400">★</span> 额度已人工修改</span>
          <span className="flex items-center gap-1"><span className="text-amber-500">✎</span> 备注已修改</span>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        title="确认预警"
        message={`确认预警 ${confirmTarget?.contract_no || ''} 的保函到期信息已处理？确认后不可撤回。`}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      <ConfirmDialog
        open={batchConfirmOpen}
        title="批量确认预警"
        message={`确认选中的 ${selectedIds.size} 条预警记录？确认后不可撤回。`}
        onConfirm={handleBatchConfirm}
        onCancel={() => setBatchConfirmOpen(false)}
      />

      <RemarkDialog
        open={!!remarkTarget}
        currentRemark={remarkTarget?.remark || ''}
        warningId={remarkTarget?.id || ''}
        onSave={handleRemarkSave}
        onCancel={() => setRemarkTarget(null)}
      />
    </div>
  )
}
