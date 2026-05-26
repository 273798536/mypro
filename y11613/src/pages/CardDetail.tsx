import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Gift,
  History,
  AlertTriangle,
  Plus,
  Minus,
} from 'lucide-react';
import { api } from '@/api/client';
import { MemberCard, BalanceLedger } from '@/types';
import {
  formatMoney,
  formatDateTime,
  getLedgerTypeLabel,
  getLedgerTypeColor,
  getStatusLabel,
  getStatusColor,
  getExceptionWarning,
} from '@/utils/format';
import { useAppStore } from '@/store';
import Modal from '@/components/Modal';

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<MemberCard | null>(null);
  const [ledger, setLedger] = useState<BalanceLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [consumeAmount, setConsumeAmount] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRule, setSelectedRule] = useState('');
  const { operator, showToast } = useAppStore();

  useEffect(() => {
    if (id) {
      loadData();
      loadStores();
      loadRules();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [cardData, ledgerData] = await Promise.all([
        api.cards.get(id!),
        api.cards.ledger(id!),
      ]);
      setCard(cardData as MemberCard);
      setLedger(ledgerData as BalanceLedger[]);
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadStores() {
    try {
      const data = await api.stores.list();
      setStores(data as any[]);
      if ((data as any[]).length > 0) {
        setSelectedStore((data as any[])[0].id);
      }
    } catch (error) {
      console.error('加载门店失败:', error);
    }
  }

  async function loadRules() {
    try {
      const data = await api.rules.list();
      setRules(data as any[]);
      const activeRule = (data as any[]).find((r) => r.is_active === 1);
      if (activeRule) {
        setSelectedRule(activeRule.id);
      }
    } catch (error) {
      console.error('加载规则失败:', error);
    }
  }

  async function handleRecharge() {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      showToast('请输入有效金额', 'error');
      return;
    }
    try {
      await api.recharge.create({
        cardId: id!,
        principalAmount: amount,
        ruleId: selectedRule || undefined,
        operator,
        source: 'manual',
        remark: '手动充值',
      });
      showToast('充值成功');
      setShowRechargeModal(false);
      setRechargeAmount('');
      loadData();
    } catch (error: any) {
      showToast(error.message || '充值失败', 'error');
    }
  }

  async function handleConsume() {
    const amount = parseFloat(consumeAmount);
    if (!amount || amount <= 0) {
      showToast('请输入有效金额', 'error');
      return;
    }
    if (!selectedStore) {
      showToast('请选择门店', 'error');
      return;
    }
    try {
      const result: any = await api.consume.create({
        cardId: id!,
        storeId: selectedStore,
        amount,
        operator,
        remark: '消费',
      });
      if (result.warning) {
        showToast(result.warning, 'warning');
      } else {
        showToast('消费成功');
      }
      setShowConsumeModal(false);
      setConsumeAmount('');
      loadData();
    } catch (error: any) {
      showToast(error.message || '消费失败', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12 text-gray-500">
        <CreditCard className="mx-auto mb-4 opacity-50" size={48} />
        <p>会员卡不存在</p>
        <button
          onClick={() => navigate('/cards')}
          className="mt-4 text-navy-600 hover:text-navy-800"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/cards')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-display font-bold text-navy-900">会员卡详情</h1>
      </div>

      <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/60 text-sm">会员卡</p>
            <p className="text-2xl font-bold mt-1">{card.card_no}</p>
            <p className="text-white/80 mt-1">{card.user_name}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm rounded-full ${
              card.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-300'
                : card.status === 'frozen'
                ? 'bg-gray-500/20 text-gray-300'
                : 'bg-orange-500/20 text-orange-300'
            }`}
          >
            {getStatusLabel(card.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Wallet size={16} />
              本金余额
            </div>
            <p className="text-2xl font-bold">{formatMoney(card.principal_balance)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Gift size={16} />
              赠送金
            </div>
            <p className="text-2xl font-bold text-gold-400">
              {formatMoney(card.bonus_balance)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <CreditCard size={16} />
              总余额
            </div>
            <p className="text-3xl font-bold">
              {formatMoney(card.principal_balance + card.bonus_balance)}
            </p>
          </div>
        </div>

        {card.status === 'active' && (
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setShowRechargeModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gold-500 text-navy-900 font-semibold rounded-xl hover:bg-gold-400 transition-colors"
            >
              <Plus size={20} />
              充值
            </button>
            <button
              onClick={() => setShowConsumeModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-navy-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Minus size={20} />
              消费
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History className="text-navy-900" size={20} />
            <h3 className="text-lg font-display font-semibold text-navy-900">余额账本</h3>
          </div>
        </div>
        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
          {ledger.map((item) => (
            <div
              key={item.id}
              className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                item.is_exception ? 'bg-red-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.amount > 0
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {item.amount > 0 ? (
                      <Plus size={18} />
                    ) : (
                      <Minus size={18} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getLedgerTypeColor(item.type)}`}>
                        {getLedgerTypeLabel(item.type)}
                      </span>
                      {item.is_exception && (
                        <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={12} />
                          {getExceptionWarning(item.exception_type || '')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.remark}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      操作人: {item.operator} · {formatDateTime(item.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      item.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {item.amount > 0 ? '+' : ''}
                    {formatMoney(item.amount)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    {item.principal_amount !== 0 && (
                      <p>
                        本金: {item.principal_amount > 0 ? '+' : ''}
                        {formatMoney(item.principal_amount)}
                      </p>
                    )}
                    {item.bonus_amount !== 0 && (
                      <p className="text-gold-600">
                        赠送金: {item.bonus_amount > 0 ? '+' : ''}
                        {formatMoney(item.bonus_amount)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    余额: {formatMoney(item.balance_after)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {ledger.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <History className="mx-auto mb-4 opacity-50" size={48} />
              <p>暂无账本记录</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        title="会员卡充值"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              充值金额 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入充值金额"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">赠送金规则</label>
            <select
              value={selectedRule}
              onChange={(e) => setSelectedRule(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="">不使用规则</option>
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} (v{rule.version})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowRechargeModal(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleRecharge}
              className="flex-1 px-4 py-2 bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
            >
              确认充值
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showConsumeModal}
        onClose={() => setShowConsumeModal(false)}
        title="消费记账"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              消费门店 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              消费金额 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={consumeAmount}
              onChange={(e) => setConsumeAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入消费金额"
              min="0"
              step="0.01"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              可用余额:{' '}
              <span className="font-semibold text-navy-900">
                {formatMoney(card.principal_balance + card.bonus_balance)}
              </span>
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowConsumeModal(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConsume}
              className="flex-1 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
            >
              确认消费
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
