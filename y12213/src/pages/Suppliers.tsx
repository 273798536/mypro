import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../store'
import { Search, AlertTriangle, Building2 } from 'lucide-react'
import type { Supplier, SupplierDetail } from '../types'
import { api } from '../api'

export default function Suppliers() {
  const { suppliers, loading, fetchSuppliers } = useStore()
  const [keyword, setKeyword] = useState('')
  const [detailTarget, setDetailTarget] = useState<SupplierDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleSearch = useCallback(() => {
    fetchSuppliers(keyword || undefined)
  }, [fetchSuppliers, keyword])

  const handleViewDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const detail = await api.suppliers.get(id)
      setDetailTarget(detail)
    } catch {
      setDetailTarget(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const getStatusBadge = (status: string) => {
    if (status === 'expired')
      return <span className="px-2 py-0.5 rounded text-xs bg-red-600 text-white">资质过期</span>
    return <span className="px-2 py-0.5 rounded text-xs bg-green-800 text-green-200">资质有效</span>
  }

  const renderMissingField = (value: string | null, label: string) => {
    if (!value)
      return <span className="text-red-400 text-xs italic border border-dashed border-red-800 px-1 rounded">未填写{label}</span>
    return <span className="text-zinc-200 text-sm">{value}</span>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-100">供应商档案</h2>
        <p className="text-sm text-zinc-500 mt-1">供应商基础信息管理，缺字段项标红提示</p>
      </div>

      <div className="mb-4 flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <Search size={14} className="text-zinc-500" />
        <input
          type="text"
          placeholder="搜索供应商名称或联系人..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-1.5 text-sm bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition-colors"
        >
          搜索
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">供应商</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">资质状态</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">联系人</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">联系电话</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">地址</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">加载中...</td>
                  </tr>
                )}
                {!loading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">暂无供应商</td>
                  </tr>
                )}
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-zinc-500" />
                        <span className="text-zinc-200 font-medium">{s.name}</span>
                        {s.missing_fields.length > 0 && (
                          <AlertTriangle size={12} className="text-red-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{getStatusBadge(s.qualification_status)}</td>
                    <td className="px-4 py-2.5">{renderMissingField(s.contact_person, '联系人')}</td>
                    <td className="px-4 py-2.5">{renderMissingField(s.contact_phone, '电话')}</td>
                    <td className="px-4 py-2.5">{renderMissingField(s.address, '地址')}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleViewDetail(s.id)}
                        className="px-3 py-1 text-xs text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1">
          {detailTarget ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-zinc-100">{detailTarget.name}</h3>
                <button
                  onClick={() => setDetailTarget(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  关闭
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">资质状态</span>
                  {getStatusBadge(detailTarget.qualification_status)}
                </div>
                <div>
                  <span className="text-xs text-zinc-500">联系人</span>
                  <div className="mt-0.5">{renderMissingField(detailTarget.contact_person, '联系人')}</div>
                </div>
                <div>
                  <span className="text-xs text-zinc-500">联系电话</span>
                  <div className="mt-0.5">{renderMissingField(detailTarget.contact_phone, '电话')}</div>
                </div>
                <div>
                  <span className="text-xs text-zinc-500">地址</span>
                  <div className="mt-0.5">{renderMissingField(detailTarget.address, '地址')}</div>
                </div>
              </div>

              {detailTarget.missing_fields.length > 0 && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded mb-4">
                  <p className="text-xs text-red-300 font-medium mb-1">缺失字段：</p>
                  <div className="flex flex-wrap gap-1">
                    {detailTarget.missing_fields.map((f) => (
                      <span key={f} className="px-2 py-0.5 text-xs bg-red-900/60 text-red-300 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-2">关联合同 ({detailTarget.contracts?.length || 0})</h4>
                {detailTarget.contracts && detailTarget.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {detailTarget.contracts.map((c) => (
                      <div key={c.id} className="p-3 bg-zinc-800/50 rounded border border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-zinc-300">{c.contract_no}</span>
                          {c.expired_warning_count > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded">有过期预警</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                          <span>保函: {c.guarantee_no || <span className="text-red-400 italic">缺失</span>}</span>
                          <span>额度: {(c.quota_used / 10000).toFixed(1)}万/{(c.quota_total / 10000).toFixed(1)}万</span>
                          {c.quota_manually_modified && <span className="text-amber-400">★额度已改</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">暂无关联合同</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <Building2 size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-600">点击供应商"详情"查看关联信息</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
