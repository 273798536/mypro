import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { StatusTag } from '@/components/ui/StatusTag'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Download, GitCompare } from 'lucide-react'

export function Revenue() {
  const { splitResults, fetchSplitResults, rules, fetchRules, loading } = useStore()
  const [selectedRule, setSelectedRule] = useState<string>('')
  const [compareVersion, setCompareVersion] = useState<{ v1: number; v2: number } | null>(null)

  useEffect(() => {
    fetchSplitResults()
    fetchRules()
  }, [fetchSplitResults, fetchRules])

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">收入归集</h1>
          <p className="text-slate-500 mt-1">查看分账结果，对比规则版本差异</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Download size={18} />
          导出报表
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">总营收</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ¥{splitResults.reduce((sum, r) => sum + r.finalAmount, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">分账笔数</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{splitResults.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">已确认</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {splitResults.filter(r => r.status === 'CONFIRMED').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">分账瀑布图</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: '场馆运营', value: 2850, color: '#4f46e5' },
                { name: '票务服务', value: 1425, color: '#10b981' },
                { name: '主办方', value: 18525, color: '#f59e0b' },
                { name: '艺术家', value: 8550, color: '#8b5cf6' },
                { name: '赞助抵扣', value: 425, color: '#ef4444' },
              ]}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={80} />
              <Tooltip formatter={(value: number) => [`¥${value.toFixed(2)}`, '金额']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {[
                  { name: '场馆运营', value: 2850, color: '#4f46e5' },
                  { name: '票务服务', value: 1425, color: '#10b981' },
                  { name: '主办方', value: 18525, color: '#f59e0b' },
                  { name: '艺术家', value: 8550, color: '#8b5cf6' },
                  { name: '赞助抵扣', value: 425, color: '#ef4444' },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">分账结果明细</h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedRule}
              onChange={(e) => setSelectedRule(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">全部规则</option>
              {rules.map(r => (
                <option key={r.id} value={r.id}>{r.ruleName}</option>
              ))}
            </select>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">订单号</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">展览</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">规则名称</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">版本</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">金额</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">状态</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {splitResults.map((result) => (
              <tr key={result.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-sm text-slate-900">{result.orderNo || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{result.exhibitionName || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{result.ruleName || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">v{result.ruleVersion}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">¥{result.finalAmount.toFixed(2)}</td>
                <td className="px-6 py-4"><StatusTag status={result.status} /></td>
                <td className="px-6 py-4">
                  <button className="text-sm text-indigo-600 hover:text-indigo-800">
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
