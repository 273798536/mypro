import { useEffect, useState } from 'react'
import { Plus, Eye, Snowflake, Play, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../lib/api'
import { toast } from '../components/UI/Toast'
import StatusBadge from '../components/UI/StatusBadge'
import Drawer from '../components/UI/Drawer'
import Modal from '../components/UI/Modal'
import type { RefundBatch, BatchItem } from '../../shared/types'

export default function Batches() {
  const { participants, fetchParticipants, selectedParticipants, clearSelectedParticipants } = useAppStore()
  const [batches, setBatches] = useState<RefundBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<RefundBatch | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
  })

  useEffect(() => {
    fetchBatches()
    fetchParticipants({ status: 'calculated' })
  }, [fetchParticipants])

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const result = await api.batches.list()
      setBatches(result.batches)
    } catch (error) {
      toast.error('获取批次列表失败')
    } finally {
      setLoading(false)
    }
  }

  const viewDetail = async (batch: RefundBatch) => {
    setSelectedBatch(batch)
    setShowDetail(true)
    
    setLoadingItems(true)
    try {
      const detail = await api.batches.get(batch.id)
      setBatchItems(detail.items || [])
    } catch (error) {
      toast.error('获取批次详情失败')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleCreateBatch = async () => {
    if (!createForm.name.trim()) {
      toast.warning('请输入批次名称')
      return
    }

    if (selectedParticipants.length === 0) {
      toast.warning('请先选择参与人')
      return
    }

    try {
      await api.batches.create({
        name: createForm.name,
        participantIds: selectedParticipants,
      })
      toast.success('批次创建成功')
      setShowCreateModal(false)
      setCreateForm({ name: '' })
      clearSelectedParticipants()
      fetchBatches()
      fetchParticipants({ status: 'calculated' })
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleFreeze = async (batch: RefundBatch) => {
    try {
      await api.batches.freeze(batch.id)
      toast.success('批次已冻结')
      fetchBatches()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleUnfreeze = async (batch: RefundBatch) => {
    try {
      await api.batches.unfreeze(batch.id)
      toast.success('批次已解冻')
      fetchBatches()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleExecute = async (batch: RefundBatch) => {
    if (!confirm(`确认执行批次"${batch.name}"吗？执行后将标记所有参与人为已退款。`)) {
      return
    }

    try {
      await api.batches.execute(batch.id)
      toast.success('批次执行成功')
      fetchBatches()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const payChannelLabels: Record<string, string> = {
    alipay: '支付宝',
    wechat: '微信',
    card: '银行卡',
  }

  const calculatedParticipants = participants.filter((p) => p.status === 'calculated')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">批次管理</h1>
          <p className="text-sm text-slate-500 mt-1">创建和管理退款批次，支持冻结和批量执行</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建批次
        </button>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header py-3 px-4">批次名称</th>
                <th className="table-header py-3 px-4">状态</th>
                <th className="table-header py-3 px-4">总金额</th>
                <th className="table-header py-3 px-4">手续费</th>
                <th className="table-header py-3 px-4">实际退款</th>
                <th className="table-header py-3 px-4">创建时间</th>
                <th className="table-header py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center text-slate-500">
                    暂无批次
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="table-cell py-3 px-4 font-medium">{batch.name}</td>
                    <td className="table-cell py-3 px-4">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="table-cell py-3 px-4 font-mono">
                      ¥{batch.totalAmount.toFixed(2)}
                    </td>
                    <td className="table-cell py-3 px-4 font-mono text-orange-600">
                      ¥{batch.totalFee.toFixed(2)}
                    </td>
                    <td className="table-cell py-3 px-4 font-mono font-medium text-green-600">
                      ¥{batch.totalActualRefund.toFixed(2)}
                    </td>
                    <td className="table-cell py-3 px-4 text-sm text-slate-500">
                      {new Date(batch.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="table-cell py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewDetail(batch)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {batch.status === 'pending' && (
                          <button
                            onClick={() => handleFreeze(batch)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="冻结批次"
                          >
                            <Snowflake className="h-4 w-4" />
                          </button>
                        )}
                        {batch.status === 'frozen' && (
                          <button
                            onClick={() => handleUnfreeze(batch)}
                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="解冻批次"
                          >
                            <Snowflake className="h-4 w-4" />
                          </button>
                        )}
                        {batch.status === 'pending' && (
                          <button
                            onClick={() => handleExecute(batch)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="执行批次"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
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
        title="批次详情"
      >
        {selectedBatch && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">批次名称：</span>
                  <span className="text-slate-900">{selectedBatch.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">状态：</span>
                  <StatusBadge status={selectedBatch.status} />
                </div>
                <div>
                  <span className="text-slate-500">创建人：</span>
                  <span className="text-slate-900">{selectedBatch.createdBy}</span>
                </div>
                <div>
                  <span className="text-slate-500">创建时间：</span>
                  <span className="text-slate-900">
                    {new Date(selectedBatch.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">金额汇总</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">总金额：</span>
                  <span className="font-mono">¥{selectedBatch.totalAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500">手续费：</span>
                  <span className="font-mono text-orange-600">-¥{selectedBatch.totalFee.toFixed(2)}</span>
                </div>
                <div className="col-span-2 border-t pt-3">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-700">实际退款：</span>
                    <span className="font-mono text-green-600">¥{selectedBatch.totalActualRefund.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">
                批次明细 ({batchItems.length} 条)
              </h3>
              {loadingItems ? (
                <div className="text-sm text-slate-400">加载中...</div>
              ) : batchItems.length === 0 ? (
                <div className="text-sm text-slate-400">暂无明细</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {batchItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">
                            {item.participant?.userName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.participant?.orderNo} · {item.participant?.tierName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-green-600">
                            ¥{item.snapshotActualRefund.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            (手续费 ¥{item.snapshotFeeAmount.toFixed(2)})
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建退款批次"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleCreateBatch} className="btn btn-primary">
              创建
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">批次名称</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="input"
              placeholder="例如：2024年Q1第一批退款"
            />
          </div>
          <div>
            <label className="label">
              已选择参与人 ({selectedParticipants.length} 条)
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {calculatedParticipants.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm">暂无已计算的参与人</p>
                  <p className="text-xs text-slate-400 mt-1">请先在"退款计算"页面完成计算</p>
                </div>
              ) : (
                calculatedParticipants.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(p.id)}
                      onChange={() => useAppStore.getState().toggleSelectedParticipant(p.id)}
                      className="rounded border-slate-300"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.userName}</div>
                      <div className="text-xs text-slate-500">
                        {p.orderNo} · ¥{p.actualRefund?.toFixed(2)}
                      </div>
                    </div>
                    {p.anomalies && p.anomalies.length > 0 && (
                      <span className="anomaly-badge text-xs">异常</span>
                    )}
                  </label>
                ))
              )}
            </div>
            {selectedParticipants.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">预计实际退款总额：</span>
                  <span className="font-mono font-medium text-green-600">
                    ¥{participants
                      .filter((p) => selectedParticipants.includes(p.id))
                      .reduce((sum, p) => sum + (p.actualRefund || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
