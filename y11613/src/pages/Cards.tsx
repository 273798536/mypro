import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, CreditCard, Eye, MoreVertical } from 'lucide-react';
import { api } from '@/api/client';
import { MemberCard } from '@/types';
import { formatMoney, formatDateTime, getStatusLabel, getStatusColor } from '@/utils/format';
import { useAppStore } from '@/store';
import Modal from '@/components/Modal';

export default function Cards() {
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCard, setNewCard] = useState({ cardNo: '', userName: '', phone: '' });
  const navigate = useNavigate();
  const { operator, showToast } = useAppStore();

  useEffect(() => {
    loadCards();
  }, [search, statusFilter]);

  async function loadCards() {
    try {
      setLoading(true);
      const data = await api.cards.list({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setCards(data as MemberCard[]);
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCard.cardNo || !newCard.userName) {
      showToast('请填写完整信息', 'error');
      return;
    }
    try {
      await api.cards.create({ ...newCard, operator });
      showToast('创建成功');
      setShowCreateModal(false);
      setNewCard({ cardNo: '', userName: '', phone: '' });
      loadCards();
    } catch (error: any) {
      showToast(error.message || '创建失败', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">会员卡管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
        >
          <Plus size={18} />
          新增会员卡
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索卡号、姓名、手机号..."
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
            <option value="active">正常</option>
            <option value="frozen">冻结</option>
            <option value="refunded">已退卡</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/cards/${card.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-navy-700 to-navy-900 rounded-xl flex items-center justify-center">
                    <CreditCard className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900">{card.user_name}</p>
                    <p className="text-sm text-gray-500">{card.card_no}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                    card.status
                  )}`}
                >
                  {getStatusLabel(card.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">本金余额</span>
                  <span className="font-semibold text-navy-900">
                    {formatMoney(card.principal_balance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">赠送金</span>
                  <span className="font-semibold text-gold-600">
                    {formatMoney(card.bonus_balance)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between">
                  <span className="text-gray-500">总余额</span>
                  <span className="font-bold text-navy-900">
                    {formatMoney(card.principal_balance + card.bonus_balance)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>创建于 {formatDateTime(card.created_at)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/cards/${card.id}`);
                  }}
                  className="flex items-center gap-1 text-navy-600 hover:text-navy-800"
                >
                  <Eye size={14} />
                  详情
                </button>
              </div>
            </div>
          ))}

          {cards.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <CreditCard className="mx-auto mb-4 opacity-50" size={48} />
              <p>暂无会员卡数据</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新增会员卡"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              卡号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCard.cardNo}
              onChange={(e) => setNewCard({ ...newCard, cardNo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入卡号"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCard.userName}
              onChange={(e) => setNewCard({ ...newCard, userName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              type="text"
              value={newCard.phone}
              onChange={(e) => setNewCard({ ...newCard, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              placeholder="请输入手机号"
            />
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
              确认创建
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
