import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Filter,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatMoney, getErrorTypeLabel } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import type { Distribution, BadRow, TiedRankGroup } from '../../shared/types'

export default function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [badRows, setBadRows] = useState<BadRow[]>([])
  const [tiedRankGroups, setTiedRankGroups] = useState<TiedRankGroup[]>([])
  const [total, setTotal] = useState(0)
  const [batches, setBatches] = useState<{ id: string; status: string }[]>([])

  const [filters, setFilters] = useState({
    batch_id: '',
    status: '',
    has_tied_rank: false,
    has_dispute: false,
    has_duplicate_resend: false,
  })

  const [showBadRows, setShowBadRows] = useState(true)
  const [expandedTiedGroups, setExpandedTiedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.getBatches().then(setBatches)
  }, [])

  useEffect(() => {
    setLoading(true)
    api
      .getDistributions({
        ...filters,
        page: 1,
        page_size: 50,
      })
      .then((res) => {
        setDistributions(res.data)
        setBadRows(res.bad_rows)
        setTiedRankGroups(res.tied_rank_groups)
        setTotal(res.total)
        setLoading(false)
      })
  }, [filters])

  const toggleTiedGroup = (groupId: string) => {
    setExpandedTiedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const normalDistributions = distributions.filter((d) => !d.is_tied)
  const tiedDistributions = distributions.filter((d) => d.is_tied)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">奖金发放列表</h1>
        <p className="text-gray-400">共 {total} 条记录 | 并列名次 {tiedRankGroups.length} 组 | 坏行 {badRows.length} 条</p>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold">筛选条件</span>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">发放批次</label>
            <select
              value={filters.batch_id}
              onChange={(e) => setFilters((f) => ({ ...f, batch_id: e.target.value }))}
              className="bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-48"
            >
              <option value="">全部批次</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">发放状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-36"
            >
              <option value="">全部状态</option>
              <option value="pending">待发放</option>
              <option value="paid">已发放</option>
              <option value="failed">发放失败</option>
              <option value="disputed">有争议</option>
            </select>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.has_tied_rank}
                onChange={(e) => setFilters((f) => ({ ...f, has_tied_rank: e.target.checked }))}
                className="w-4 h-4 accent-emerald-500"
              />
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-sm">仅显示并列名次</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.has_dispute}
                onChange={(e) => setFilters((f) => ({ ...f, has_dispute: e.target.checked }))}
                className="w-4 h-4 accent-emerald-500"
              />
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm">扣款争议</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.has_duplicate_resend}
                onChange={(e) => setFilters((f) => ({ ...f, has_duplicate_resend: e.target.checked }))}
                className="w-4 h-4 accent-emerald-500"
              />
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-sm">重发重复</span>
            </label>
          </div>
        </div>
      </div>

      {badRows.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowBadRows(!showBadRows)}
            className="w-full bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center justify-between hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="font-semibold text-red-400">
                坏行隔离区 - {badRows.length} 条数据存在问题
              </span>
              <span className="text-sm text-red-300/70">
                （空行、缺列、格式错误等，已自动隔离不混入正常结果）
              </span>
            </div>
            {showBadRows ? <ChevronDown className="w-5 h-5 text-red-400" /> : <ChevronRight className="w-5 h-5 text-red-400" />}
          </button>
          {showBadRows && (
            <div className="mt-2 bg-[#1a1a2e] border border-red-500/20 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-red-900/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-red-300 font-medium">行号</th>
                    <th className="px-4 py-3 text-left text-red-300 font-medium">错误类型</th>
                    <th className="px-4 py-3 text-left text-red-300 font-medium">错误描述</th>
                    <th className="px-4 py-3 text-left text-red-300 font-medium">原始内容</th>
                    <th className="px-4 py-3 text-left text-red-300 font-medium">来源</th>
                  </tr>
                </thead>
                <tbody>
                  {badRows.map((row) => (
                    <tr key={row.id} className="border-t border-red-500/10">
                      <td className="px-4 py-3 font-mono text-red-300">{row.line_number}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                          {getErrorTypeLabel(row.error_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{row.error_description}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-xs truncate">
                        {row.raw_line || '(空)'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0f0f1a]">
                <tr>
                  <th className="px-4 py-4 text-left text-gray-400 font-medium">名次</th>
                  <th className="px-4 py-4 text-left text-gray-400 font-medium">选手</th>
                  <th className="px-4 py-4 text-right text-gray-400 font-medium">奖金总额</th>
                  <th className="px-4 py-4 text-right text-gray-400 font-medium">扣款</th>
                  <th className="px-4 py-4 text-right text-gray-400 font-medium">税费</th>
                  <th className="px-4 py-4 text-right text-gray-400 font-medium">税后实发</th>
                  <th className="px-4 py-4 text-center text-gray-400 font-medium">状态</th>
                  <th className="px-4 py-4 text-center text-gray-400 font-medium">银行卡</th>
                  <th className="px-4 py-4 text-center text-gray-400 font-medium">标记</th>
                  <th className="px-4 py-4 text-center text-gray-400 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {normalDistributions.map((dist) => (
                  <tr
                    key={dist.id}
                    className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/detail/${dist.id}`)}
                  >
                    <td className="px-4 py-4 font-mono font-bold">{dist.rank}</td>
                    <td className="px-4 py-4 font-medium">{dist.player_name}</td>
                    <td className="px-4 py-4 text-right font-mono">{formatMoney(dist.gross_prize)}</td>
                    <td className="px-4 py-4 text-right font-mono text-red-400">
                      {dist.total_deductions > 0 ? `-${formatMoney(dist.total_deductions)}` : '-'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-amber-400">
                      -{formatMoney(dist.tax_amount)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-400">
                      {formatMoney(dist.net_amount)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={dist.status} />
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-gray-400">
                      ****{dist.bank_card_last4}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        {dist.has_dispute && (
                          <span title="扣款争议" className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        {dist.has_duplicate_resend && (
                          <span title="重发过" className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/detail/${dist.id}`)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {tiedRankGroups.map((group) => {
                  const groupPlayers = tiedDistributions.filter(
                    (d) => d.tied_rank_group_id === group.id
                  )
                  if (groupPlayers.length === 0) return null
                  const isExpanded = expandedTiedGroups.has(group.id)

                  return (
                    <React.Fragment key={group.id}>
                      <tr
                        className="border-t border-amber-500/30 bg-amber-500/5 cursor-pointer"
                        onClick={() => toggleTiedGroup(group.id)}
                      >
                        <td colSpan={10} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-amber-400" />
                            )}
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 font-semibold">
                              并列第 {group.rank} 名
                            </span>
                            <span className="text-amber-300/60 text-sm">
                              共 {groupPlayers.length} 人 - 点击展开
                            </span>
                            <span className="text-amber-500/50 text-xs ml-auto">
                              ⚠️ 并列名次不自动混入正常排序
                            </span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded &&
                        groupPlayers.map((dist) => (
                          <tr
                            key={dist.id}
                            className="border-t border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            onClick={() => navigate(`/detail/${dist.id}`)}
                          >
                            <td className="px-4 py-4 font-mono font-bold text-amber-400 pl-12">
                              {group.rank} (并列)
                            </td>
                            <td className="px-4 py-4 font-medium">{dist.player_name}</td>
                            <td className="px-4 py-4 text-right font-mono">
                              {formatMoney(dist.gross_prize)}
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-red-400">
                              {dist.total_deductions > 0
                                ? `-${formatMoney(dist.total_deductions)}`
                                : '-'}
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-amber-400">
                              -{formatMoney(dist.tax_amount)}
                            </td>
                            <td className="px-4 py-4 text-right font-mono font-bold text-emerald-400">
                              {formatMoney(dist.net_amount)}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <StatusBadge status={dist.status} />
                            </td>
                            <td className="px-4 py-4 text-center font-mono text-gray-400">
                              ****{dist.bank_card_last4}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex justify-center gap-1">
                                {dist.has_dispute && (
                                  <span
                                    title="扣款争议"
                                    className="w-2 h-2 rounded-full bg-amber-500"
                                  />
                                )}
                                {dist.has_duplicate_resend && (
                                  <span
                                    title="重发过"
                                    className="w-2 h-2 rounded-full bg-blue-500"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/detail/${dist.id}`)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
