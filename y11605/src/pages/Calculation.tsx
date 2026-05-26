import { useEffect, useState } from 'react'
import { Calculator, Settings as SettingsIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../lib/api'
import { toast } from '../components/UI/Toast'
import StatusBadge from '../components/UI/StatusBadge'
import Modal from '../components/UI/Modal'

export default function Calculation() {
  const {
    participants,
    selectedParticipants,
    fetchParticipants,
    clearSelectedParticipants,
    rules,
    fetchRules,
    activeRule,
  } = useAppStore()

  const [calculating, setCalculating] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [ruleForm, setRuleForm] = useState<{
    name: string
    deductFee: boolean
    giftDeductRate: number
    earlyBirdHandling: 'full_refund' | 'deduct_discount' | 'custom'
    customEarlyBirdRate: number
  }>({
    name: '',
    deductFee: true,
    giftDeductRate: 1,
    earlyBirdHandling: 'full_refund',
    customEarlyBirdRate: 0,
  })
  const [calculationPreview, setCalculationPreview] = useState<any[]>([])

  useEffect(() => {
    fetchParticipants({ status: 'pending' })
    fetchRules()
  }, [fetchParticipants, fetchRules])

  const handleCalculate = async () => {
    if (selectedParticipants.length === 0) {
      toast.warning('请先选择参与人')
      return
    }

    if (!activeRule) {
      toast.warning('请先配置退款规则')
      return
    }

    setCalculating(true)
    try {
      const result = await api.calculation.calculate({
        participantIds: selectedParticipants,
        ruleId: activeRule.id,
      })
      setCalculationPreview(result)
      toast.success(`成功计算 ${result.length} 条记录`)
      fetchParticipants()
      clearSelectedParticipants()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setCalculating(false)
    }
  }

  const handleCreateRule = async () => {
    try {
      await api.calculation.createRule(ruleForm)
      toast.success('规则创建成功')
      setShowRuleModal(false)
      fetchRules()
      setRuleForm({
        name: '',
        deductFee: true,
        giftDeductRate: 1,
        earlyBirdHandling: 'full_refund',
        customEarlyBirdRate: 0,
      })
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const pendingCount = participants.filter((p) => p.status === 'pending').length
  const calculatedCount = participants.filter((p) => p.status === 'calculated').length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">退款计算</h1>
        <p className="text-sm text-slate-500 mt-1">配置规则并批量计算退款金额</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">待计算参与人</h2>
              <span className="text-sm text-slate-500">
                已选择 {selectedParticipants.length} / {pendingCount} 条
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {participants
                .filter((p) => p.status === 'pending')
                .map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(p.id)}
                      onChange={() => useAppStore.getState().toggleSelectedParticipant(p.id)}
                      className="rounded border-slate-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{p.userName}</div>
                      <div className="text-xs text-slate-500">
                        {p.orderNo} · {p.tierName} · ¥{p.payAmount.toFixed(2)}
                      </div>
                    </div>
                    {p.anomalies && p.anomalies.length > 0 && (
                      <div className="flex gap-1">
                        {p.anomalies.slice(0, 2).map((a, i) => (
                          <span key={i} className="anomaly-badge text-xs">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </label>
                ))}
              {pendingCount === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>所有参与人均已完成计算</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  const pendingIds = participants
                    .filter((p) => p.status === 'pending')
                    .map((p) => p.id)
                  useAppStore.getState().setSelectedParticipants(pendingIds)
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                全选待计算
              </button>
              <button
                onClick={handleCalculate}
                disabled={selectedParticipants.length === 0 || calculating || !activeRule}
                className="btn btn-primary"
              >
                <Calculator className="h-4 w-4 mr-2" />
                {calculating ? '计算中...' : `计算 ${selectedParticipants.length} 条`}
              </button>
            </div>
          </div>

          {calculationPreview.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">计算结果预览</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="table-header py-2 px-3">用户</th>
                      <th className="table-header py-2 px-3">支付金额</th>
                      <th className="table-header py-2 px-3">应退金额</th>
                      <th className="table-header py-2 px-3">手续费</th>
                      <th className="table-header py-2 px-3">实际退款</th>
                      <th className="table-header py-2 px-3">异常</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {calculationPreview.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td className="table-cell py-2 px-3">
                          <div className="text-sm font-medium">{p.userName}</div>
                          <div className="text-xs text-slate-500">{p.orderNo}</div>
                        </td>
                        <td className="table-cell py-2 px-3 font-mono text-sm">
                          ¥{p.payAmount.toFixed(2)}
                        </td>
                        <td className="table-cell py-2 px-3 font-mono text-sm">
                          ¥{p.refundAmount?.toFixed(2)}
                        </td>
                        <td className="table-cell py-2 px-3 font-mono text-sm text-orange-600">
                          ¥{p.feeAmount?.toFixed(2)}
                        </td>
                        <td className="table-cell py-2 px-3 font-mono text-sm font-medium text-green-600">
                          ¥{p.actualRefund?.toFixed(2)}
                        </td>
                        <td className="table-cell py-2 px-3">
                          {p.anomalies && p.anomalies.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.anomalies.map((a: string, i: number) => (
                                <span key={i} className="anomaly-badge text-xs">
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">当前规则</h2>
              <button
                onClick={() => setShowRuleModal(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </div>

            {activeRule ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-500">规则名称</span>
                  <p className="font-medium">{activeRule.name}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">扣除手续费</span>
                  <p className="font-medium">{activeRule.deductFee ? '是' : '否'}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">赠品抵扣比例</span>
                  <p className="font-medium">{(activeRule.giftDeductRate * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">早鸟价处理</span>
                  <p className="font-medium">
                    {activeRule.earlyBirdHandling === 'full_refund'
                      ? '全额退款'
                      : activeRule.earlyBirdHandling === 'deduct_discount'
                      ? '扣除折扣部分'
                      : `自定义比例 ${(activeRule.customEarlyBirdRate * 100).toFixed(0)}%`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 text-orange-500" />
                <p>暂无可用规则</p>
                <button onClick={() => setShowRuleModal(true)} className="btn btn-primary mt-4">
                  创建规则
                </button>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">计算说明</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">计算公式</p>
                <code className="block mt-1 p-2 bg-slate-50 rounded text-xs">
                  实际退款 = 应退金额 - 手续费 - 赠品抵扣
                </code>
              </div>
              <div>
                <p className="font-medium text-slate-900">手续费</p>
                <p>支付宝/微信：0.6%，银行卡：1% + 2元</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">异常标记</p>
                <p>同用户多档位、赠品已发货、渠道手续费差异等会被标记为异常，需人工确认。</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">计算进度</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">待计算</span>
                <span className="font-medium">{pendingCount}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-slate-400 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      participants.length > 0
                        ? (pendingCount / participants.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">已计算</span>
                <span className="font-medium">{calculatedCount}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      participants.length > 0
                        ? (calculatedCount / participants.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title="创建退款规则"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowRuleModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleCreateRule} className="btn btn-primary">
              创建
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">规则名称</label>
            <input
              type="text"
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              className="input"
              placeholder="例如：默认退款规则"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="deductFee"
              checked={ruleForm.deductFee}
              onChange={(e) => setRuleForm({ ...ruleForm, deductFee: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="deductFee" className="text-sm text-slate-700">
              扣除支付渠道手续费
            </label>
          </div>
          <div>
            <label className="label">赠品抵扣比例（%）</label>
            <input
              type="number"
              min="0"
              max="100"
              value={ruleForm.giftDeductRate * 100}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, giftDeductRate: Number(e.target.value) / 100 })
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">早鸟价处理方式</label>
            <select
              value={ruleForm.earlyBirdHandling}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, earlyBirdHandling: e.target.value as 'full_refund' | 'deduct_discount' | 'custom' })
              }
              className="input"
            >
              <option value="full_refund">全额退款（不扣除早鸟折扣）</option>
              <option value="deduct_discount">扣除折扣部分</option>
              <option value="custom">自定义比例</option>
            </select>
          </div>
          {ruleForm.earlyBirdHandling === 'custom' && (
            <div>
              <label className="label">早鸟折扣扣除比例（%）</label>
              <input
                type="number"
                min="0"
                max="100"
                value={ruleForm.customEarlyBirdRate * 100}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    customEarlyBirdRate: Number(e.target.value) / 100,
                  })
                }
                className="input"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
