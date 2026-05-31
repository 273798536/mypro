import { useEffect, useState, useCallback } from 'react'
import { Upload, Filter, ArrowRightLeft, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import CountryFlag from '@/components/CountryFlag'
import StatusBadge from '@/components/StatusBadge'
import ImportModal from '@/components/ImportModal'

interface OrderItem {
  id: string
  order_id: string
  country: string
  period: string
  gross_amount: number
  vat_rate: number
  vat_amount: number
  source: string
  status: string
  created_at: string
  updated_at: string
}

interface ReturnItem {
  id: string
  return_id: string
  original_order_id: string
  country: string
  period: string
  gross_amount: number
  vat_rate: number
  vat_amount: number
  is_late_arrival: number
  original_period: string | null
  status: string
  created_at: string
}

const COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'SE', 'PT', 'IE', 'DK', 'FI', 'CZ', 'HU']

export default function Orders() {
  const { selectedPeriod, filters, setFilter } = useAppStore()
  const [tab, setTab] = useState<'orders' | 'returns'>('orders')
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [returns, setReturns] = useState<ReturnItem[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [reassignItem, setReassignItem] = useState<{ id: string; type: 'order' | 'return'; currentCountry: string } | null>(null)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [reassignReason, setReassignReason] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const api = useApi()

  const fetchOrders = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.country) params.set('country', filters.country)
    if (selectedPeriod) params.set('period', selectedPeriod)
    if (filters.status) params.set('status', filters.status)
    api.get<{ success: boolean; data: OrderItem[] }>(`/api/orders?${params}`).then((res) => setOrders(res.data)).catch(() => setOrders([]))
  }, [filters.country, filters.status, selectedPeriod])

  const fetchReturns = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.country) params.set('country', filters.country)
    if (selectedPeriod) params.set('period', selectedPeriod)
    if (filters.status) params.set('status', filters.status)
    api.get<{ success: boolean; data: ReturnItem[] }>(`/api/returns?${params}`).then((res) => setReturns(res.data)).catch(() => setReturns([]))
  }, [filters.country, filters.status, selectedPeriod])

  useEffect(() => {
    if (tab === 'orders') fetchOrders()
    else fetchReturns()
  }, [tab, fetchOrders, fetchReturns])

  const handleReassign = async () => {
    if (!reassignItem || !selectedCountry || !reassignReason.trim()) return
    setReassigning(true)
    try {
      const endpoint =
        reassignItem.type === 'order'
          ? `/api/orders/${reassignItem.id}/country`
          : `/api/returns/${reassignItem.id}/confirm`
      await api.put(endpoint, { newCountry: selectedCountry.toUpperCase(), reason: reassignReason.trim() })
      if (tab === 'orders') fetchOrders()
      else fetchReturns()
    } finally {
      setReassigning(false)
      setReassignItem(null)
      setSelectedCountry('')
      setReassignReason('')
    }
  }

  const openReassign = (item: OrderItem | ReturnItem, type: 'order' | 'return') => {
    setReassignItem({ id: item.id, type, currentCountry: item.country })
    setSelectedCountry('')
    setReassignReason('')
  }

  const items = tab === 'orders' ? orders : returns

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-navy-500">
          {tab === 'orders' ? '订单管理' : '退货管理'}
        </h1>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-navy-500 rounded-lg hover:bg-navy-600"
        >
          <Upload size={16} />
          导入{tab === 'orders' ? '订单' : '退货'}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('orders')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === 'orders' ? 'bg-white text-navy-500 shadow-sm font-medium' : 'text-gray-500'
            }`}
          >
            订单
          </button>
          <button
            onClick={() => setTab('returns')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === 'returns' ? 'bg-white text-navy-500 shadow-sm font-medium' : 'text-gray-500'
            }`}
          >
            退货
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-4">
        <Filter size={16} className="text-gray-400" />
        <select
          value={filters.country}
          onChange={(e) => setFilter('country', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
        >
          <option value="">全部国家</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="month"
          value={selectedPeriod}
          onChange={(e) => useAppStore.getState().setSelectedPeriod(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
        >
          <option value="">全部状态</option>
          <option value="normal">正常</option>
          <option value="adjusted">已调整</option>
          <option value="exception">异常</option>
        </select>
        <button
          onClick={() => { if (tab === 'orders') fetchOrders(); else fetchReturns(); }}
          className="ml-auto p-1.5 rounded-lg hover:bg-gray-100"
        >
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">国家</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">期间</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">金额</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">税率</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">税额</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">来源</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">状态</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const displayId = tab === 'orders'
                  ? (item as OrderItem).order_id || item.id
                  : (item as ReturnItem).return_id || item.id
                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-navy-500 font-medium">#{displayId}</td>
                    <td className="px-4 py-3"><CountryFlag code={item.country} /></td>
                    <td className="px-4 py-3 text-gray-600">{item.period}</td>
                    <td className="px-4 py-3 text-right text-gray-600">€{item.gross_amount.toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{item.vat_rate.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-medium text-navy-500">€{item.vat_amount.toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 text-gray-500">{item.source}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openReassign(item, tab === 'orders' ? 'order' : 'return')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50"
                      >
                        <ArrowRightLeft size={12} />
                        调整国家
                      </button>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reassignItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReassignItem(null)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-serif text-navy-500">调整国家</h2>
              <button onClick={() => setReassignItem(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <span className="text-gray-400 text-xl">&times;</span>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                将 #{reassignItem.id.slice(0, 8)} 的国家从 <strong>{reassignItem.currentCountry}</strong> 调整为：
              </p>
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-1">
                  目标国家 <span className="text-coral-500">*</span>
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
                >
                  <option value="">请选择国家</option>
                  {COUNTRIES.filter((c) => c !== reassignItem.currentCountry).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-500 mb-1">
                  原因 <span className="text-coral-500">*</span>
                </label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="请输入调整原因..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setReassignItem(null)}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleReassign}
                disabled={!selectedCountry || !reassignReason.trim() || reassigning}
                className="px-4 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reassigning ? '处理中...' : '确认调整'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={tab === 'orders' ? '导入订单' : '导入退货'}
        apiEndpoint={tab === 'orders' ? '/api/orders/import' : '/api/returns/import'}
        dataKey={tab === 'orders' ? 'orders' : 'returns'}
        onImported={() => { if (tab === 'orders') fetchOrders(); else fetchReturns(); }}
      />
    </div>
  )
}
