import { useEffect, useState } from 'react';
import { Plus, Check, Clock, AlertCircle, Settings } from 'lucide-react';
import { api } from '@/api/client';
import { BonusRule } from '@/types';
import { formatMoney, formatDateTime } from '@/utils/format';
import { useAppStore } from '@/store';
import Modal from '@/components/Modal';

export default function Rules() {
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { operator, showToast } = useAppStore();

  const [newRule, setNewRule] = useState({
    name: '',
    tiers: [{ minAmount: 100, bonusRate: 10, maxBonus: 50 }],
    priority: 'bonus_first' as 'bonus_first' | 'principal_first',
    effectiveFrom: '',
    effectiveTo: '',
  });

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      setLoading(true);
      const data = await api.rules.list();
      setRules(data as BonusRule[]);
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newRule.name || !newRule.effectiveFrom) {
      showToast('请填写完整信息', 'error');
      return;
    }
    try {
      await api.rules.create({
        name: newRule.name,
        tiers: newRule.tiers,
        priority: newRule.priority,
        effectiveFrom: newRule.effectiveFrom,
        effectiveTo: newRule.effectiveTo || undefined,
        createdBy: operator,
      });
      showToast('规则创建成功');
      setShowCreateModal(false);
      setNewRule({
        name: '',
        tiers: [{ minAmount: 100, bonusRate: 10, maxBonus: 50 }],
        priority: 'bonus_first',
        effectiveFrom: '',
        effectiveTo: '',
      });
      loadRules();
    } catch (error: any) {
      showToast(error.message || '创建失败', 'error');
    }
  }

  async function handleActivate(id: string) {
    if (!confirm('确定要激活此规则吗？激活后当前生效规则将被停用。')) {
      return;
    }
    try {
      await api.rules.activate(id, { operator });
      showToast('规则已激活');
      loadRules();
    } catch (error: any) {
      showToast(error.message || '操作失败', 'error');
    }
  }

  function addTier() {
    setNewRule({
      ...newRule,
      tiers: [...newRule.tiers, { minAmount: 0, bonusRate: 0, maxBonus: undefined }],
    });
  }

  function updateTier(index: number, field: string, value: any) {
    const updated = [...newRule.tiers];
    (updated[index] as any)[field] = value;
    setNewRule({ ...newRule, tiers: updated });
  }

  function removeTier(index: number) {
    if (newRule.tiers.length <= 1) return;
    const updated = newRule.tiers.filter((_, i) => i !== index);
    setNewRule({ ...newRule, tiers: updated });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">赠送金规则</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
        >
          <Plus size={18} />
          新建规则
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-xl shadow-sm border p-6 ${
                rule.is_active
                  ? 'border-gold-400 bg-gold-50/30'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      rule.is_active
                        ? 'bg-gold-500'
                        : 'bg-gray-200'
                    }`}
                  >
                    <Settings
                      className={rule.is_active ? 'text-white' : 'text-gray-500'}
                      size={24}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-navy-900">{rule.name}</p>
                      {rule.is_active && (
                        <span className="bg-gold-100 text-gold-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={12} />
                          当前生效
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      版本 v{rule.version} · {rule.priority === 'bonus_first' ? '赠送金优先抵扣' : '本金优先抵扣'}
                    </p>
                  </div>
                </div>
                {!rule.is_active && (
                  <button
                    onClick={() => handleActivate(rule.id)}
                    className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    激活此版本
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">阶梯规则</p>
                  <div className="space-y-1">
                    {rule.tiers.map((tier, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        满{formatMoney(tier.minAmount)}赠{tier.bonusRate}%
                        {tier.maxBonus && ` (上限${formatMoney(tier.maxBonus)})`}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">生效时间</p>
                  <p className="text-sm text-gray-700">
                    {formatDateTime(rule.effective_from)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">创建信息</p>
                  <p className="text-sm text-gray-700">
                    {rule.created_by} · {formatDateTime(rule.created_at)}
                  </p>
                </div>
              </div>

              {rule.effective_to && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>失效时间: {formatDateTime(rule.effective_to)}</span>
                </div>
              )}
            </div>
          ))}

          {rules.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Settings className="mx-auto mb-4 opacity-50" size={48} />
              <p>暂无赠送金规则</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新建赠送金规则"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-amber-500 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">规则说明</p>
                <p className="mt-1">新规则激活后，当前生效的规则将自动停用。历史充值记录不受规则变更影响。</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              规则名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="如：2024年Q1赠送金规则"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              阶梯规则 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {newRule.tiers.map((tier, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">满(元)</label>
                    <input
                      type="number"
                      value={tier.minAmount}
                      onChange={(e) =>
                        updateTier(index, 'minAmount', Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">赠送比例(%)</label>
                    <input
                      type="number"
                      value={tier.bonusRate}
                      onChange={(e) =>
                        updateTier(index, 'bonusRate', Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">上限(元)</label>
                    <input
                      type="number"
                      value={tier.maxBonus || ''}
                      onChange={(e) =>
                        updateTier(
                          index,
                          'maxBonus',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                      placeholder="可选"
                    />
                  </div>
                  {newRule.tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(index)}
                      className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addTier}
              className="mt-2 text-sm text-navy-600 hover:text-navy-800"
            >
              + 添加阶梯
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              抵扣优先级 <span className="text-red-500">*</span>
            </label>
            <select
              value={newRule.priority}
              onChange={(e) =>
                setNewRule({
                  ...newRule,
                  priority: e.target.value as 'bonus_first' | 'principal_first',
                })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="bonus_first">赠送金优先抵扣</option>
              <option value="principal_first">本金优先抵扣</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                生效时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={newRule.effectiveFrom}
                onChange={(e) =>
                  setNewRule({ ...newRule, effectiveFrom: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                失效时间
              </label>
              <input
                type="datetime-local"
                value={newRule.effectiveTo}
                onChange={(e) =>
                  setNewRule({ ...newRule, effectiveTo: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
            >
              创建规则
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
