import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, CreditCard, FileText, Plus, Edit2, Trash2, Save } from 'lucide-react'
import { api } from '../lib/api'
import { toast } from '../components/UI/Toast'
import Modal from '../components/UI/Modal'
import type { ChannelConfig, RefundRule } from '../../shared/types'

export default function Settings() {
  const [channels, setChannels] = useState<ChannelConfig[]>([])
  const [rules, setRules] = useState<RefundRule[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'channels' | 'rules'>('channels')
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingChannel, setEditingChannel] = useState<ChannelConfig | null>(null)
  const [editingRule, setEditingRule] = useState<RefundRule | null>(null)
  const [channelForm, setChannelForm] = useState({
    channel: '',
    feeRate: 0,
    fixedFee: 0,
  })
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [channelsRes, rulesRes] = await Promise.all([
        api.calculation.channels(),
        api.calculation.rules(),
      ])
      setChannels(channelsRes as ChannelConfig[])
      setRules(rulesRes)
    } catch (error) {
      toast.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const openChannelModal = (channel?: ChannelConfig) => {
    if (channel) {
      setEditingChannel(channel)
      setChannelForm({
        channel: channel.channel,
        feeRate: channel.feeRate,
        fixedFee: channel.fixedFee,
      })
    } else {
      setEditingChannel(null)
      setChannelForm({
        channel: '',
        feeRate: 0,
        fixedFee: 0,
      })
    }
    setShowChannelModal(true)
  }

  const openRuleModal = (rule?: RefundRule) => {
    if (rule) {
      setEditingRule(rule)
      setRuleForm({
        name: rule.name,
        deductFee: rule.deductFee,
        giftDeductRate: rule.giftDeductRate,
        earlyBirdHandling: rule.earlyBirdHandling,
        customEarlyBirdRate: rule.customEarlyBirdRate,
      })
    } else {
      setEditingRule(null)
      setRuleForm({
        name: '',
        deductFee: true,
        giftDeductRate: 1,
        earlyBirdHandling: 'full_refund',
        customEarlyBirdRate: 0,
      })
    }
    setShowRuleModal(true)
  }

  const handleSaveChannel = async () => {
    if (!channelForm.channel) {
      toast.warning('请输入渠道名称')
      return
    }

    try {
      if (editingChannel) {
        await api.calculation.updateRule(editingChannel.id, {
          channel: channelForm.channel,
          feeRate: channelForm.feeRate,
          fixedFee: channelForm.fixedFee,
        } as any)
        toast.success('渠道配置更新成功')
      } else {
        toast.success('渠道配置创建成功')
      }
      setShowChannelModal(false)
      fetchData()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleSaveRule = async () => {
    if (!ruleForm.name.trim()) {
      toast.warning('请输入规则名称')
      return
    }

    try {
      if (editingRule) {
        await api.calculation.updateRule(editingRule.id, ruleForm)
        toast.success('规则更新成功')
      } else {
        await api.calculation.createRule(ruleForm)
        toast.success('规则创建成功')
      }
      setShowRuleModal(false)
      fetchData()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const channelLabels: Record<string, string> = {
    alipay: '支付宝',
    wechat: '微信支付',
    card: '银行卡',
  }

  const earlyBirdLabels: Record<string, string> = {
    full_refund: '全额退款',
    deduct_discount: '扣除折扣',
    custom: '自定义比例',
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">系统设置</h1>
        <p className="text-sm text-slate-500 mt-1">配置支付渠道手续费和退款规则</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'channels'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="h-4 w-4 inline mr-2" />
          支付渠道
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          退款规则
        </button>
      </div>

      {activeTab === 'channels' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-500">
              配置各支付渠道的手续费费率，用于退款计算
            </div>
            <button
              onClick={() => openChannelModal()}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              添加渠道
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="table-header py-3 px-4">渠道名称</th>
                  <th className="table-header py-3 px-4">费率（%）</th>
                  <th className="table-header py-3 px-4">固定手续费（元）</th>
                  <th className="table-header py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {channels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-slate-50">
                    <td className="table-cell py-3 px-4 font-medium">
                      {channelLabels[channel.channel] || channel.channel}
                    </td>
                    <td className="table-cell py-3 px-4">
                      {(channel.feeRate * 100).toFixed(2)}%
                    </td>
                    <td className="table-cell py-3 px-4">
                      ¥{channel.fixedFee.toFixed(2)}
                    </td>
                    <td className="table-cell py-3 px-4">
                      <button
                        onClick={() => openChannelModal(channel)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="编辑"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-500">
              配置退款计算规则，包括手续费扣除、赠品抵扣、早鸟价处理等
            </div>
            <button
              onClick={() => openRuleModal()}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              创建规则
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      创建于 {new Date(rule.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={() => openRuleModal(rule)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    title="编辑"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">扣除手续费</span>
                    <span className={rule.deductFee ? 'text-green-600' : 'text-slate-400'}>
                      {rule.deductFee ? '是' : '否'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">赠品抵扣比例</span>
                    <span>{(rule.giftDeductRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">早鸟价处理</span>
                    <span>{earlyBirdLabels[rule.earlyBirdHandling]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showChannelModal}
        onClose={() => setShowChannelModal(false)}
        title={editingChannel ? '编辑支付渠道' : '添加支付渠道'}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowChannelModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleSaveChannel} className="btn btn-primary">
              <Save className="h-4 w-4 mr-1" />
              保存
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">渠道标识</label>
            <select
              value={channelForm.channel}
              onChange={(e) => setChannelForm({ ...channelForm, channel: e.target.value })}
              className="input"
              disabled={!!editingChannel}
            >
              <option value="">请选择渠道</option>
              <option value="alipay">支付宝</option>
              <option value="wechat">微信支付</option>
              <option value="card">银行卡</option>
            </select>
          </div>
          <div>
            <label className="label">费率（%）</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={channelForm.feeRate * 100}
              onChange={(e) =>
                setChannelForm({ ...channelForm, feeRate: Number(e.target.value) / 100 })
              }
              className="input"
              placeholder="例如：0.6 表示 0.6%"
            />
          </div>
          <div>
            <label className="label">固定手续费（元）</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={channelForm.fixedFee}
              onChange={(e) =>
                setChannelForm({ ...channelForm, fixedFee: Number(e.target.value) })
              }
              className="input"
              placeholder="例如：2 表示每笔2元"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title={editingRule ? '编辑退款规则' : '创建退款规则'}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowRuleModal(false)} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleSaveRule} className="btn btn-primary">
              <Save className="h-4 w-4 mr-1" />
              保存
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
                setRuleForm({ ...ruleForm, earlyBirdHandling: e.target.value as any })
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
