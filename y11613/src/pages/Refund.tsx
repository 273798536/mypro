import { useEffect, useState } from 'react';
import { LogOut, Plus, Search, Check, X, AlertTriangle } from 'lucide-react';
import { api } from '@/api/client';
import { RefundRequest } from '@/types';
import { formatMoney, formatDateTime, getStatusLabel, getStatusColor } from '@/utils/format';
import { useAppStore } from '@/store';
import Modal from '@/components/Modal';

export default function Refund() {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const { operator, showToast } = useAppStore();

  useEffect(() => {
    loadData();
    loadCards();
  }, [statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await api.refund.list({
        status: statusFilter || undefined,
      });
      setRequests(data as RefundRequest[]);
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

  async function handleCreate() {
    if (!selectedCardId) {
      showToast('请选择会员卡', 'error');
      return;
    }
    try {
      await api.refund.create({
        cardId: selectedCardId,
        applicant: operator,
      });
      showToast('退卡申请已提交');
      setShowCreateModal(false);
      setSelectedCardId('');
      loadData();
    } catch (error: any) {
      showToast(error.message || '提交失败', 'error');
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.refund.approve(id, { approver: operator });
      showToast('审核通过');
      loadData();
    } catch (error: any) {
      showToast(error.message || '操作失败', 'error');
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('请输入拒绝原因:');
    if (!reason) return;
    try {
      await api.refund.reject(id, { approver: operator, reason });
      showToast('已拒绝');
      loadData();
    } catch (error: any) {
      showToast(error.message || '操作失败', 'error');
    }
  }

  const filteredRequests = requests.filter(
    (r) =>
      !search ||
      r.card_no?.includes(search) ||
      r.user_name?.includes(search)
  );

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-display font-bold text-navy-900">退卡管理</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {pendingCount} 条待审核
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={18} />
          申请退卡
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索卡号、姓名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          >
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
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
                  本金余额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  赠送金
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  退款金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申请时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{request.user_name}</p>
                      <p className="text-sm text-gray-500">{request.card_no}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {formatMoney(request.principal_balance)}
                  </td>
                  <td className="px-6 py-4 text-gold-600">
                    {formatMoney(request.bonus_balance)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">
                    {formatMoney(request.refund_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{request.applicant}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {formatDateTime(request.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {request.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="通过"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="拒绝"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                    {request.reject_reason && (
                      <p className="text-xs text-gray-400 mt-1">
                        拒绝原因: {request.reject_reason}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRequests.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <LogOut className="mx-auto mb-4 opacity-50" size={48} />
              <p>暂无退卡申请</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="申请退卡"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-orange-500 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">退卡说明</p>
                <p className="mt-1">退卡后本金余额将退还，赠送金余额将清零。退卡申请审核通过后会员卡将无法使用。</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择会员卡 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            >
              <option value="">请选择会员卡</option>
              {cards
                .filter((c) => c.status === 'active')
                .map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.user_name} - {card.card_no} (本金:{' '}
                    {formatMoney(card.principal_balance)})
                  </option>
                ))}
            </select>
          </div>
          {selectedCardId && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                预计退款金额:{' '}
                <span className="font-semibold text-emerald-600">
                  {formatMoney(
                    cards.find((c) => c.id === selectedCardId)?.principal_balance || 0
                  )}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (赠送金{' '}
                {formatMoney(
                  cards.find((c) => c.id === selectedCardId)?.bonus_balance || 0
                )}{' '}
                将不予退还)
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              提交申请
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
