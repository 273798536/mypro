import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from 'recharts'
import { useAppStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import CountryFlag from '@/components/CountryFlag'

interface VatSummary {
  country: string
  orderVat: number
  returnVat: number
  netVat: number
  billedVat: number
  difference: number
}

interface ExceptionTypeStat {
  type: string
  count: number
  total_impact: number
}

interface ExceptionStatsData {
  byType: ExceptionTypeStat[]
  byStatus: { status: string; count: number }[]
  totalPending: number
  totalPendingImpact: number
}

interface TrendData {
  period: string
  netVat: number
  billedVat: number
  difference: number
}

const TYPE_LABELS: Record<string, string> = {
  cross_period_rate: '税率跨期',
  late_return: '退货晚到',
  country_mismatch: '国家错配',
}

interface SummaryResponse {
  overview: { totalAccruals: number; totalOrders: number; totalReturns: number; totalBills: number; pendingExceptions: number }
  statusBreakdown: { status: string; count: number; total_net_vat: number; total_difference: number }[]
  countrySummary: { country: string; total_order_vat: number; total_return_vat: number; total_net_vat: number; total_billed_vat: number; total_difference: number }[]
  recentPeriods: string[]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { selectedPeriod, setSelectedPeriod } = useAppStore()
  const [summaries, setSummaries] = useState<VatSummary[]>([])
  const [pendingExceptions, setPendingExceptions] = useState(0)
  const [exceptionStats, setExceptionStats] = useState<ExceptionTypeStat[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const api = useApi()

  useEffect(() => {
    api.get<{ success: boolean; data: SummaryResponse }>(`/api/vat-accruals/summary?period=${selectedPeriod}`).then((res) => {
      const data = res.data
      setSummaries(
        data.countrySummary.map((cs) => ({
          country: cs.country,
          orderVat: cs.total_order_vat,
          returnVat: cs.total_return_vat,
          netVat: cs.total_net_vat,
          billedVat: cs.total_billed_vat,
          difference: cs.total_difference,
        }))
      )
      setPendingExceptions(data.overview.pendingExceptions)
    }).catch(() => {})
  }, [selectedPeriod])

  useEffect(() => {
    api.get<{ success: boolean; data: ExceptionStatsData }>('/api/exceptions/stats').then((res) => {
      setExceptionStats(res.data.byType)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.get<{ success: boolean; data: { period: string; net_vat: number; billed_vat: number; difference: number }[] }>('/api/vat-accruals').then((res) => {
      const accruals = res.data
      const grouped = new Map<string, { netVat: number; billedVat: number; difference: number }>()
      for (const a of accruals) {
        const existing = grouped.get(a.period)
        if (existing) {
          existing.netVat += a.net_vat
          existing.billedVat += a.billed_vat
          existing.difference += a.difference
        } else {
          grouped.set(a.period, { netVat: a.net_vat, billedVat: a.billed_vat, difference: a.difference })
        }
      }
      const trend = Array.from(grouped.entries())
        .map(([period, v]) => ({ period, ...v }))
        .sort((a, b) => a.period.localeCompare(b.period))
      setTrendData(trend)
    }).catch(() => {})
  }, [selectedPeriod])

  const totalNetVat = summaries.reduce((s, v) => s + v.netVat, 0)
  const totalDiff = summaries.reduce((s, v) => s + v.difference, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-navy-500">VAT预提总览</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">期间</label>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-navy-500">
          <p className="text-sm text-gray-500 mb-1">净VAT合计</p>
          <p className="text-2xl font-semibold text-navy-500">
            €{totalNetVat.toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500">
          <p className="text-sm text-gray-500 mb-1">已开票VAT</p>
          <p className="text-2xl font-semibold text-emerald-500">
            €{(totalNetVat - totalDiff).toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-coral-500">
          <p className="text-sm text-gray-500 mb-1">待处理异常</p>
          <p className="text-2xl font-semibold text-coral-500">
            {pendingExceptions}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-serif text-navy-500 mb-3">各国VAT明细</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((s) => (
            <div key={s.country} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border-l-4 border-navy-500">
              <div className="flex items-center justify-between mb-3">
                <CountryFlag code={s.country} />
                <span className="text-xs text-gray-400">{selectedPeriod}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">订单VAT</span>
                  <span className="font-medium">€{s.orderVat.toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">退货VAT</span>
                  <span className="font-medium">€{s.returnVat.toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-gray-500">净VAT</span>
                  <span className="font-semibold text-navy-500">€{s.netVat.toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">账单VAT</span>
                  <span className="font-medium">€{s.billedVat.toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-gray-500">差异</span>
                  <span className={`font-semibold ${s.difference < 0 ? 'text-coral-500' : 'text-emerald-500'}`}>
                    {s.difference < 0 ? '-' : '+'}€{Math.abs(s.difference).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {exceptionStats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-serif text-navy-500">异常提醒</h2>
            <button
              onClick={() => navigate('/exceptions')}
              className="flex items-center gap-1 text-sm text-amber-500 hover:text-amber-600"
            >
              查看全部 <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exceptionStats.map((stat) => (
              <div
                key={stat.type}
                className={`bg-gradient-to-r from-amber-50 to-coral-50 rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => navigate('/exceptions')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <span className="text-sm font-medium text-navy-500">{TYPE_LABELS[stat.type] || stat.type}</span>
                </div>
                <p className="text-2xl font-semibold text-coral-500">{stat.count}</p>
                <p className="text-xs text-gray-500 mt-1">条待处理</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {trendData.length > 0 && (
        <div>
          <h2 className="text-lg font-serif text-navy-500 mb-3">VAT趋势</h2>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-navy-300" />
              <span className="text-sm text-gray-500">净VAT vs 账单VAT</span>
            </div>
            <ComposedChart data={trendData} width={700} height={320}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#8B96B3" />
              <YAxis tick={{ fontSize: 12 }} stroke="#8B96B3" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => `€${value.toLocaleString('zh-CN')}`}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="difference"
                name="差异"
                fill="#E8EBF0"
                stroke="none"
                fillOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="netVat"
                name="净VAT"
                stroke="#1B2A4A"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="billedVat"
                name="账单VAT"
                stroke="#2D9D78"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </div>
        </div>
      )}
    </div>
  )
}
