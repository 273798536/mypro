import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Search, RotateCcw, AlertTriangle, Store } from 'lucide-react';
import { api } from '@/api/client';
import { Consumption } from '@/types';
import { formatMoney, formatDateTime, getExceptionWarning } from '@/utils/format';
import { useAppStore } from '@/store';
import Modal from '@/components/Modal';

export default function Consume() {
  const [records, setRecords] = useState<Consumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Consumption | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [form, setForm] = useState({ cardId: '', storeId: '', amount: '' });
  const { operator, showToast } = useAppStore();

  useEffect(() => {
    loadData();
    loadCards();
    loadStores();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await api.consume.list();
      setRecords(data as Consumption[]);
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

  async function loadStores() {
    try {
      const data = await api.stores.list();
      setStores(data as any[]);
      if ((data as any[]).length > 0) {
        setForm((f) => ({ ...f, storeId: (data as any[])[0].id }));
      }
    } catch (error) {
      console.error('加载门店失败:', error);
    }
  }

  async function handleCreate() {
    if (!form.cardId || !form.storeId || !form.amount) {
      showToast('请填写完整信息', 'error');
      return;
    }
    try {
      const result: any = await api.consume.create({
        cardId: form.cardId,
        storeId: form.storeId,
        amount: parseFloat(form.amount),
        operator,
      });
      if (result.warning) {
        showToast(result.warning, 'warning');
      } else {
        showToast('消费成功');
      }
      setShowCreateModal(false);
      setForm({ cardId: '', storeId: '', amount: '' });
      loadData();
    } catch (error: any) {
      showToast(error.message || '消费失败', 'error');
    }
  }

  async function handleReverse() {
    if (!selectedRecord || !reverseReason) {
      showToast('请填写撤销原因', 'error');
      return;
    }
    try {
      const result: any = await api.consume.reverse(selectedRecord.id, {
        operator,
        reason: reverseReason,
      });
      if (result.warning) {
        showToast(result.warning, 'warning');
      } else {
        showToast('撤销成功');
      }
      setShowReverseModal(false);
      setSelectedRecord(null);
      setReverseReason('');
      loadData();
    } catch (error: any) {
      showToast(error.message || '撤销失败', 'error');
    }
  }

  const filteredRecords = records.filter(
    (r) =>
      !search ||
      r.card_no?.includes(search) ||
      r.user_name?.includes(search) ||
      r.store_name.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">消费记账</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
        >
          <Plus size={18} />
          新增消费
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索卡号、姓名、门店..."
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
                  门店
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  消费金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  本金/赠送金
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className={`hover:bg-gray-50 ${
                    record.is_reversed ? 'bg-gray-50 opacity-60' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{record.user_name}</p>
                      <p className="text-sm text-gray-500">{record.card_no}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-gray-400" />
                      <span>
                        {record.store_name}
                        {record.is_cross_store && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                            跨店
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-red-600">
                    -{formatMoney(record.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <p className="text-gray-900">本金: {formatMoney(record.principal_used)}</p>
                    <p className="text-gold-600">
                      赠送金: {formatMoney(record.bonus_used)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {record.is_reversed ? (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        已撤销
                      </span>
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded">
                        正常
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {formatDateTime(record.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!record.is_reversed && (
                      <button
                        onClick={() => {
                          setSelectedRecord(record);
                          setShowReverseModal(true);
                        }}
                        className="text-orange-600 hover:text-orange-800 text-sm flex items-center gap-1 ml-auto"
                      >
                        <RotateCcw size={14} />
                        撤销
                      </button>
                    )}
                    {record.reverse_reason && (
                      <p className="text-xs text-gray-400 mt-1">
                        撤销原因: {record.reverse_reason}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="mx-auto mb-4 opacity-50" size={48} />
              <p>暂无消费记录</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新增消费"
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
              消费门店 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.storeId}
              onChange={(e) => setForm({ ...form, storeId: e.target.value })}
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
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入消费金额"
              min="0"
              step="0.01"
            />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-yellow-500 mt-0.5" />
              <p className="text-sm text-yellow-800">
                消费金额将按照规则自动从本金和赠送金中扣除
              </p>
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
              className="flex-1 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
            >
              确认消费
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showReverseModal}
        onClose={() => setShowReverseModal(false)}
        title="撤销消费"
      >
        <div className="space-y-4">
          {selectedRecord && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p>
                <span className="text-gray-500">会员卡:</span>{' '}
                <span className="font-medium">
                  {selectedRecord.user_name} ({selectedRecord.card_no})
                </span>
              </p>
              <p>
                <span className="text-gray-500">门店:</span>{' '}
                <span className="font-medium">{selectedRecord.store_name}</span>
              </p>
              <p>
                <span className="text-gray-500">金额:</span>{' '}
                <span className="font-semibold text-red-600">
                  {formatMoney(selectedRecord.amount)}
                </span>
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              撤销原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入撤销原因"
              rows={3}
            />
          </div>
          {selectedRecord?.is_cross_store && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-orange-500 mt-0.5" />
                <p className="text-sm text-orange-800">
                  注意：这是一笔跨店消费，撤销后需要门店对账确认
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowReverseModal(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleReverse}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              确认撤销
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
