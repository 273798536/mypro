import { useEffect, useState } from 'react';
import { Wallet, Plus, Search } from 'lucide-react';
import { api } from '@/api/client';
import { RechargeRecord } from '@/types';
import { formatMoney, formatDateTime } from '@/utils/format';
import { useAppStore } from '@/store';
import Modal from '@/components/Modal';

export default function Recharge() {
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState({ cardId: '', principalAmount: '', ruleId: '' });
  const { operator, showToast } = useAppStore();

  useEffect(() => {
    loadData();
    loadCards();
    loadRules();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await api.recharge.list();
      setRecords(data as RechargeRecord[]);
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCards() {
    try {
      const data = await api.cards.list();
      setCards(data as any[]);
    } catch (error) {
      console.error('加载会员卡失败:', error);
    }
  }

  async function loadRules() {
    try {
      const data = await api.rules.list();
      setRules(data as any[]);
      const activeRule = (data as any[]).find((r) => r.is_active === 1);
      if (activeRule) {
        setForm((f) => ({ ...f, ruleId: activeRule.id }));
      }
    } catch (error) {
      console.error('加载规则失败:', error);
    }
  }

  async function handleCreate() {
    if (!form.cardId || !form.principalAmount) {
      showToast('请填写完整信息', 'error');
      return;
    }
    try {
      await api.recharge.create({
        cardId: form.cardId,
        principalAmount: parseFloat(form.principalAmount),
        ruleId: form.ruleId || undefined,
        operator,
        source: 'manual',
      });
      showToast('充值成功');
      setShowCreateModal(false);
      setForm({ cardId: '', principalAmount: '', ruleId: '' });
      loadData();
    } catch (error: any) {
      showToast(error.message || '充值失败', 'error');
    }
  }

  const filteredRecords = records.filter(
    (r) =>
      !search ||
      r.card_no?.includes(search) ||
      r.user_name?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">充值流水</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
        >
          <Plus size={18} />
          新增充值
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索卡号、姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  会员卡
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  本金
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  赠送金
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  总计
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{record.user_name}</p>
                      <p className="text-sm text-gray-500">{record.card_no}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {formatMoney(record.principal_amount)}
                  </td>
                  <td className="px-6 py-4 text-gold-600">
                    +{formatMoney(record.bonus_amount)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">
                    +{formatMoney(record.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{record.operator}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {formatDateTime(record.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="mx-auto mb-4 opacity-50" size={48} />
              <p>暂无充值记录</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新增充值"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              会员卡 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.cardId}
              onChange={(e) => setForm({ ...form, cardId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="">请选择会员卡</option>
              {cards
                .filter((c) => c.status === 'active')
                .map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.user_name} - {card.card_no} (余额:{' '}
                    {formatMoney(card.principal_balance + card.bonus_balance)})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              充值金额 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.principalAmount}
              onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入充值金额"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">赠送金规则</label>
            <select
              value={form.ruleId}
              onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="">不使用规则</option>
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} (v{rule.version}) {rule.is_active === 1 ? '(当前生效)' : ''}
                </option>
              ))}
            </select>
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
              className="flex-1 px-4 py-2 bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
            >
              确认充值
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
