import { useEffect, useState } from 'react'
import { Search, Eye, Edit2, AlertCircle, Filter, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../lib/api'
import { toast } from '../components/UI/Toast'
import StatusBadge from '../components/UI/StatusBadge'
import Drawer from '../components/UI/Drawer'
import Modal from '../components/UI/Modal'
import type { Participant, AuditLog } from '../../shared/types'

export default function Participants() {
  const {
    participants,
    participantsLoading,
    fetchParticipants,
    tiers,
    fetchTiers,
    selectedParticipants,
    toggleSelectedParticipant,
    clearSelectedParticipants,
    selectAllParticipants,
  } = useAppStore()

  const [filters, setFilters] = useState({
    search: '',
    tierId: '',
    payChannel: '',
    status: '',
    hasAnomalies: false,
  })
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    refundAmount: 0,
    feeAmount: 0,
    actualRefund: 0,
    reason: '',
  })
  const [history, setHistory] = useState<AuditLog[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchParticipants(filters)
    fetchTiers()
  }, [fetchParticipants, fetchTiers, filters])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value })
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      tierId: '',
      payChannel: '',
      status: '',
      hasAnomalies: false,
    })
  }

  const viewDetail = async (participant: Participant) => {
    setSelectedParticipant(participant)
    setShowDetail(true)
    
    setLoadingHistory(true)
    try {
      const logs = await api.participants.history(participant.id)
      setHistory(logs)
    } catch (error) {
      toast.error('加载历史记录失败')
    } finally {
      setLoadingHistory(false)
    }
  }

  const openEditModal = (participant: Participant) => {
    setSelectedParticipant(participant)
    setEditForm({
      refundAmount: participant.refundAmount || 0,
      feeAmount: participant.feeAmount || 0,
      actualRefund: participant.actualRefund || 0,
      reason: '',
    })
    setShowEdit(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedParticipant) return
    
    try {
      await api.participants.update(selectedParticipant.id, {
        ...editForm,
        version: selectedParticipant.version,
      })
      toast.success('保存成功')
      setShowEdit(false)
      fetchParticipants(filters)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const payChannelLabels: Record<string, string> = {
    alipay: '支付宝',
    wechat: '微信',
    card: '银行卡',
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">参与人管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理所有参与退款的用户</p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索姓名、手机号、订单号..."
              value={filters.search}
              onChange={handleSearch}
              className="input pl-10"
            />
          </div>
          
          <select
            value={filters.tierId}
            onChange={(e) => handleFilterChange('tierId', e.target.value)}
            className="input w-auto"
          >
            <option value="">所有档位</option>
            {tiers.map((t) => (
              <option key={t.tierId} value={t.tierId}>{t.tierName}</option>
            ))}
          </select>
          
          <select
            value={filters.payChannel}
            onChange={(e) => handleFilterChange('payChannel', e.target.value)}
            className="input w-auto"
          >
            <option value="">所有渠道</option>
            <option value="alipay">支付宝</option>
            <option value="wechat">微信</option>
            <option value="card">银行卡</option>
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input w-auto"
          >
            <option value="">所有状态</option>
            <option value="pending">待计算</option>
            <option value="calculated">已计算</option>
            <option value="confirmed">已确认</option>
            <option value="frozen">已冻结</option>
            <option value="refunded">已退款</option>
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hasAnomalies}
              onChange={(e) => handleFilterChange('hasAnomalies', e.target.checked)}
              className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
            />
            <span className="text-sm text-slate-600">仅显示异常</span>
          </label>
          
          <button onClick={clearFilters} className="btn btn-secondary">
            <X className="h-4 w-4 mr-1" />
            清除筛选
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">
          共 {participants.length} 条记录
          {selectedParticipants.length > 0 && (
            <span className="ml-2 text-blue-600">已选择 {selectedParticipants.length} 条</span>
          )}
        </div>
        {selectedParticipants.length > 0 && (
          <button onClick={clearSelectedParticipants} className="text-sm text-slate-500 hover:text-slate-700">
            取消选择
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.length === participants.length && participants.length > 0}
                    onChange={selectAllParticipants}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="table-header py-3 px-4">用户信息</th>
                <th className="table-header py-3 px-4">档位</th>
                <th className="table-header py-3 px-4">支付渠道</th>
                <th className="table-header py-3 px-4">支付金额</th>
                <th className="table-header py-3 px-4">应退金额</th>
                <th className="table-header py-3 px-4">手续费</th>
                <th className="table-header py-3 px-4">实际退款</th>
                <th className="table-header py-3 px-4">状态</th>
                <th className="table-header py-3 px-4">异常</th>
                <th className="table-header py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {participantsLoading ? (
                <tr>
                  <td colSpan={11} className="table-cell text-center text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={11} className="table-cell text-center text-slate-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 ${
                      p.anomalies && p.anomalies.length > 0
                        ? 'border-l-4 border-orange-400 animate-pulse-border'
                        : ''
                    }`}
                  >
                    <td className="table-cell py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(p.id)}
                        onChange={() => toggleSelectedParticipant(p.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="table-cell py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-900">{p.userName}</div>
                        <div className="text-xs text-slate-500">{p.userPhone}</div>
                        <div className="text-xs text-slate-400">{p.orderNo}</div>
                      </div>
                    </td>
                    <td className="table-cell py-3 px-4">{p.tierName}</td>
                    <td className="table-cell py-3 px-4">{payChannelLabels[p.payChannel] || p.payChannel}</td>
                    <td className="table-cell py-3 px-4 font-mono">¥{p.payAmount.toFixed(2)}</td>
                    <td className="table-cell py-3 px-4 font-mono">
                      {p.refundAmount !== null ? `¥${p.refundAmount.toFixed(2)}` : '-'}
                    </td>
                    <td className="table-cell py-3 px-4 font-mono text-orange-600">
                      {p.feeAmount !== null ? `¥${p.feeAmount.toFixed(2)}` : '-'}
                    </td>
                    <td className="table-cell py-3 px-4 font-mono font-medium text-green-600">
                      {p.actualRefund !== null ? `¥${p.actualRefund.toFixed(2)}` : '-'}
                    </td>
                    <td className="table-cell py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="table-cell py-3 px-4">
                      {p.anomalies && p.anomalies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.anomalies.map((a, i) => (
                            <span key={i} className="anomaly-badge text-xs">
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="table-cell py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewDetail(p)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="手动修正"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="参与人详情"
      >
        {selectedParticipant && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">姓名：</span>
                  <span className="text-slate-900">{selectedParticipant.userName}</span>
                </div>
                <div>
                  <span className="text-slate-500">手机号：</span>
                  <span className="text-slate-900">{selectedParticipant.userPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500">用户ID：</span>
                  <span className="text-slate-900">{selectedParticipant.userId}</span>
                </div>
                <div>
                  <span className="text-slate-500">订单号：</span>
                  <span className="text-slate-900">{selectedParticipant.orderNo}</span>
                </div>
                <div>
                  <span className="text-slate-500">档位：</span>
                  <span className="text-slate-900">{selectedParticipant.tierName}</span>
                </div>
                <div>
                  <span className="text-slate-500">支付渠道：</span>
                  <span className="text-slate-900">
                    {payChannelLabels[selectedParticipant.payChannel] || selectedParticipant.payChannel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">状态：</span>
                  <StatusBadge status={selectedParticipant.status} />
                </div>
                <div>
                  <span className="text-slate-500">版本：</span>
                  <span className="text-slate-900">v{selectedParticipant.version}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">金额信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">支付金额：</span>
                  <span className="text-slate-900 font-mono">¥{selectedParticipant.payAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500">早鸟折扣：</span>
                  <span className="text-slate-900 font-mono">¥{selectedParticipant.earlyBirdDiscount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500">赠品价值：</span>
                  <span className="text-slate-900 font-mono">¥{selectedParticipant.giftValue.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500">赠品状态：</span>
                  <span className={selectedParticipant.giftShipped ? 'text-orange-600' : 'text-green-600'}>
                    {selectedParticipant.giftShipped ? '已发货' : '未发货'}
                  </span>
                </div>
                <div className="col-span-2 border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">应退金额：</span>
                    <span className="font-mono">¥{(selectedParticipant.refundAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">手续费：</span>
                    <span className="font-mono text-orange-600">-¥{(selectedParticipant.feeAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1 font-medium">
                    <span className="text-slate-700">实际退款：</span>
                    <span className="font-mono text-green-600">¥{(selectedParticipant.actualRefund || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedParticipant.anomalies && selectedParticipant.anomalies.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-orange-600 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  异常提示
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipant.anomalies.map((a, i) => (
                    <span key={i} className="anomaly-badge">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">修改历史</h3>
              {loadingHistory ? (
                <div className="text-sm text-slate-400">加载中...</div>
              ) : history.length === 0 ? (
                <div className="text-sm text-slate-400">暂无修改记录</div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {history.map((log) => (
                    <div key={log.id} className="border-l-2 border-slate-200 pl-3 py-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{log.action}</span>
                        <span className="text-slate-400">
                          {new Date(log.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {log.reason && (
                        <div className="text-xs text-slate-500 mt-1">原因：{log.reason}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">操作人：{log.operator}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="手动修正退款金额"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowEdit(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleSaveEdit} className="btn btn-primary">
              保存
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">应退金额</label>
            <input
              type="number"
              step="0.01"
              value={editForm.refundAmount}
              onChange={(e) => setEditForm({ ...editForm, refundAmount: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">手续费</label>
            <input
              type="number"
              step="0.01"
              value={editForm.feeAmount}
              onChange={(e) => setEditForm({ ...editForm, feeAmount: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">实际退款</label>
            <input
              type="number"
              step="0.01"
              value={editForm.actualRefund}
              onChange={(e) => setEditForm({ ...editForm, actualRefund: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">修正原因 <span className="text-red-500">*</span></label>
            <textarea
              value={editForm.reason}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              className="input"
              rows={3}
              placeholder="请填写修正原因..."
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
