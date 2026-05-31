import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { Plus, Search } from 'lucide-react'
import type { CreateDerivativeData } from '../../shared/types'

export function Derivatives() {
  const { derivatives, fetchDerivatives, createDerivative, loading } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSupplementary, setFilterSupplementary] = useState<string>('')

  useEffect(() => {
    fetchDerivatives({ search, isSupplementary: filterSupplementary })
  }, [fetchDerivatives, search, filterSupplementary])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: CreateDerivativeData = {
      orderId: formData.get('orderId') as string || undefined,
      productId: formData.get('productId') as string,
      productName: formData.get('productName') as string,
      quantity: parseInt(formData.get('quantity') as string),
      unitPrice: parseFloat(formData.get('unitPrice') as string),
      saleTime: new Date().toISOString(),
      isSupplementary: formData.get('isSupplementary') === 'on',
      supplementaryNote: formData.get('supplementaryNote') as string || undefined,
    }
    await createDerivative(data)
    setShowModal(false)
    fetchDerivatives()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">衍生品销售</h1>
          <p className="text-slate-500 mt-1">管理衍生品销售记录，支持后补录入</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          新增销售
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜索产品名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterSupplementary}
          onChange={(e) => setFilterSupplementary(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">全部记录</option>
          <option value="true">后补录入</option>
          <option value="false">正常录入</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">销售单号</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">产品名称</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">数量</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">单价</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">金额</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">关联订单</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">类型</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {derivatives.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-sm text-slate-900">{d.saleNo}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{d.productName}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{d.quantity}</td>
                <td className="px-6 py-4 text-sm text-slate-600">¥{d.unitPrice.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">¥{d.totalAmount.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{d.orderId || '-'}</td>
                <td className="px-6 py-4">
                  {d.isSupplementary ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                      后补录入
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                      正常录入
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">新增衍生品销售</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">产品ID</label>
                  <input name="productId" defaultValue="PRD001" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">产品名称</label>
                  <input name="productName" defaultValue="艺术画册" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">数量</label>
                  <input name="quantity" type="number" defaultValue={1} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">单价</label>
                  <input name="unitPrice" type="number" step="0.01" defaultValue={198} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">关联订单ID（可选）</label>
                <input name="orderId" placeholder="输入票务订单ID关联" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <label className="flex items-center gap-2">
                <input name="isSupplementary" type="checkbox" className="rounded" />
                <span className="text-sm text-slate-600">后补录入</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <textarea name="supplementaryNote" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="后补录入说明..." />
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
    </div>
  )
}
