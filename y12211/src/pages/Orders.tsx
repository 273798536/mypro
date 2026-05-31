import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { StatusTag } from '@/components/ui/StatusTag'
import { Plus, Search, Filter, ChevronDown, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CreateOrderData } from '../../shared/types'

export function Orders() {
  const { orders, fetchOrders, createOrder, processSplit, loading } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [splitResult, setSplitResult] = useState<any>(null)

  useEffect(() => {
    fetchOrders({ search, status: statusFilter })
  }, [fetchOrders, search, statusFilter])

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: CreateOrderData = {
      exhibitionId: formData.get('exhibitionId') as string,
      exhibitionName: formData.get('exhibitionName') as string,
      ticketType: formData.get('ticketType') as any,
      totalAmount: parseFloat(formData.get('totalAmount') as string),
      ticketCount: parseInt(formData.get('ticketCount') as string),
      buyerName: formData.get('buyerName') as string,
      buyerPhone: formData.get('buyerPhone') as string,
      orderTime: new Date().toISOString(),
      isComboSplit: formData.get('isComboSplit') === 'on',
      hasRefund: formData.get('hasRefund') === 'on',
      refundCrossExhibition: formData.get('refundCrossExhibition') === 'on',
    }
    await createOrder(data)
    setShowModal(false)
    fetchOrders()
  }

  const handleProcessSplit = async (orderId: string) => {
    const result = await processSplit(orderId)
    setSplitResult(result)
    setSelectedOrder(orderId)
    fetchOrders()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">票务订单管理</h1>
          <p className="text-slate-500 mt-1">管理票务订单，触发分账处理</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          新增订单
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜索订单号或购买人..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">全部状态</option>
            <option value="PENDING">待处理</option>
            <option value="PROCESSED">已分账</option>
            <option value="EXCEPTION">异常</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">订单号</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">展览</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">类型</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">金额</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">购买人</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">状态</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-sm text-slate-900">{order.orderNo}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{order.exhibitionName}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {order.ticketType === 'SINGLE' ? '单场票' : '联票'}
                  {order.isComboSplit && <span className="ml-2 text-amber-600 text-xs">需拆分</span>}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">¥{order.totalAmount.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{order.buyerName || '-'}</td>
                <td className="px-6 py-4"><StatusTag status={order.status} /></td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleProcessSplit(order.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        执行分账
                      </button>
                    )}
                    <Link
                      to={`/trace/forward/${order.id}`}
                      className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800"
                    >
                      追溯
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">新增票务订单</h3>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">展览ID</label>
                  <input name="exhibitionId" defaultValue="EXH001" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">展览名称</label>
                  <input name="exhibitionName" defaultValue="当代艺术双年展" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">票种</label>
                  <select name="ticketType" className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                    <option value="SINGLE">单场票</option>
                    <option value="COMBO">联票</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">票数</label>
                  <input name="ticketCount" type="number" defaultValue={1} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">金额</label>
                <input name="totalAmount" type="number" step="0.01" defaultValue={180} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">购买人</label>
                  <input name="buyerName" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">电话</label>
                  <input name="buyerPhone" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input name="isComboSplit" type="checkbox" className="rounded" />
                  <span className="text-sm text-slate-600">需要联票拆分</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="hasRefund" type="checkbox" className="rounded" />
                  <span className="text-sm text-slate-600">存在退款</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="refundCrossExhibition" type="checkbox" className="rounded" />
                  <span className="text-sm text-slate-600">跨场退款</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  取消
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {splitResult && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">分账结果</h3>
            {splitResult.result && (
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">订单金额</span>
                  <span className="font-medium">¥{splitResult.result.totalAmount.toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 mb-2">分账明细：</p>
                  {splitResult.result.splitDetails.map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{d.stepName} - {d.recipient}</span>
                      <span>¥{d.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {splitResult.exceptions.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-amber-800 font-medium">注意：存在 {splitResult.exceptions.length} 个待确认项</p>
                    {splitResult.exceptions.map((e: any, i: number) => (
                      <p key={i} className="text-sm text-amber-700 mt-1">- {e.title}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button onClick={() => { setSplitResult(null); setSelectedOrder(null) }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
