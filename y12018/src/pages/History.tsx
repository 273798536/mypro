import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  History as HistoryIcon,
  Edit3,
  ArrowRight,
  User,
  Filter,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { CorrectionWithDistribution } from '../../shared/types'

export default function History() {
  const [corrections, setCorrections] = useState<CorrectionWithDistribution[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [batches, setBatches] = useState<{ id: string; status: string }[]>([])

  const [filters, setFilters] = useState({
    batch_id: '',
    player_name: '',
  })

  useEffect(() => {
    api.getBatches().then(setBatches)
  }, [])

  useEffect(() => {
    setLoading(true)
    api
      .getCorrections({
        ...filters,
        page: 1,
        page_size: 50,
      })
      .then((res) => {
        setCorrections(res.data)
        setTotal(res.total)
        setLoading(false)
      })
  }, [filters])

  const getFieldText = (field: string) => {
    const map: Record<string, string> = {
      status: '发放状态',
      net_amount: '实发金额',
      bank_card_last4: '银行卡尾号',
    }
    return map[field] || field
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">修正历史记录</h1>
        <p className="text-gray-400">共 {total} 条修正记录</p>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold">筛选条件</span>
        </div>
        <div className="flex gap-4 items-end">
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
            <label className="block text-sm text-gray-400 mb-1">选手姓名</label>
            <input
              type="text"
              value={filters.player_name}
              onChange={(e) => setFilters((f) => ({ ...f, player_name: e.target.value }))}
              className="bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-36"
              placeholder="搜索选手"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : corrections.length === 0 ? (
        <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-12 text-center text-gray-400">
          <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无修正记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {corrections.map((corr) => (
            <div
              key={corr.id}
              className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">
                      <Link
                        to={`/detail/${corr.distribution_id}`}
                        className="hover:text-emerald-400 transition-colors"
                      >
                        {corr.distribution.player_name}
                      </Link>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-gray-400">第{corr.distribution.rank}名</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(corr.created_at)} · {corr.operator}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
                  {getFieldText(corr.field)}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-mono">{corr.old_value}</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                  <span className="text-emerald-400 font-mono">{corr.new_value}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">修正原因</div>
                  <div className="bg-[#0f0f1a] rounded-lg px-3 py-2">{corr.reason}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">来源说明</div>
                  <div className="bg-[#0f0f1a] rounded-lg px-3 py-2">{corr.source_note}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
