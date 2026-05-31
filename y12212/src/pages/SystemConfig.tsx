import { useState, useEffect } from 'react';
import { Settings, Users, Pencil, Save, X, Plus } from 'lucide-react';
import type { TierPrice, SystemUser, UserType, UserRole } from '../../shared/types';
import { USER_TYPE_LABELS } from '../../shared/types';
import { cn } from '@/lib/utils';
import { apiGet, apiPut, apiPost } from '@/utils/api';

type TabKey = 'tier' | 'user';

const tierGroupOrder: UserType[] = ['resident', 'commercial', 'industrial'];
const tierGroupLabels: Partial<Record<UserType, string>> = {
  resident: '居民用水',
  commercial: '商业用水',
  industrial: '工业用水',
};

const roleLabels: Record<UserRole, string> = {
  reviewer: '复核员',
  supervisor: '主管',
  admin: '管理员',
};

export default function SystemConfig() {
  const [activeTab, setActiveTab] = useState<TabKey>('tier');
  const [tierPrices, setTierPrices] = useState<TierPrice[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TierPrice>>({});
  const [saving, setSaving] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    role: '' as UserRole | '',
    password: '',
  });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    if (activeTab === 'tier') loadTierPrices();
    else loadUsers();
  }, [activeTab]);

  const loadTierPrices = async () => {
    setLoading(true);
    try {
      const data = await apiGet<TierPrice[]>('/config/prices');
      setTierPrices(data);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiGet<SystemUser[]>('/config/users');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  const startEditTier = (tier: TierPrice) => {
    setEditingTierId(tier.id);
    setEditForm({
      min_usage: tier.min_usage,
      max_usage: tier.max_usage,
      price_per_ton: tier.price_per_ton,
      effective_date: tier.effective_date,
    });
  };

  const cancelEditTier = () => {
    setEditingTierId(null);
    setEditForm({});
  };

  const saveTier = async (tier: TierPrice) => {
    setSaving(true);
    try {
      await apiPut(`/config/prices/${tier.id}`, {
        ...tier,
        ...editForm,
      });
      setEditingTierId(null);
      setEditForm({});
      await loadTierPrices();
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.name || !newUser.role || !newUser.password) return;
    setAddingUser(true);
    try {
      await apiPost('/config/users', newUser);
      setShowAddUser(false);
      setNewUser({ username: '', name: '', role: '', password: '' });
      await loadUsers();
    } finally {
      setAddingUser(false);
    }
  };

  const groupedTiers = tierGroupOrder.reduce<Record<string, TierPrice[]>>((acc, type) => {
    acc[type] = tierPrices.filter((t) => t.user_type === type);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-[#1e3a5f]" />
        <h2 className="text-xl font-bold text-[#1e3a5f]">系统配置</h2>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('tier')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'tier'
              ? 'bg-[#1e3a5f] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <Settings className="h-4 w-4" />
          阶梯价格配置
        </button>
        <button
          onClick={() => setActiveTab('user')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'user'
              ? 'bg-[#1e3a5f] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <Users className="h-4 w-4" />
          用户管理
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <span className="animate-pulse text-sm">加载中...</span>
        </div>
      ) : activeTab === 'tier' ? (
        <div className="space-y-6">
          {tierGroupOrder.map((type) => {
            const tiers = groupedTiers[type] || [];
            return (
              <div key={type} className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-base font-semibold text-[#1e3a5f]">
                  {tierGroupLabels[type]}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">阶梯</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">起始用量</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">结束用量</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">单价(元/吨)</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">生效日期</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((tier) => {
                        const isEditing = editingTierId === tier.id;
                        return (
                          <tr key={tier.id} className="border-b border-gray-100">
                            <td className="px-4 py-2 font-medium text-gray-700">第{tier.tier}阶梯</td>
                            <td className="px-4 py-2">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editForm.min_usage ?? tier.min_usage}
                                  onChange={(e) =>
                                    setEditForm((f) => ({ ...f, min_usage: Number(e.target.value) }))
                                  }
                                  className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#3b82f6] focus:outline-none"
                                />
                              ) : (
                                <span>{tier.min_usage}</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editForm.max_usage ?? tier.max_usage}
                                  onChange={(e) =>
                                    setEditForm((f) => ({ ...f, max_usage: Number(e.target.value) }))
                                  }
                                  className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#3b82f6] focus:outline-none"
                                />
                              ) : (
                                <span>{tier.max_usage}</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.price_per_ton ?? tier.price_per_ton}
                                  onChange={(e) =>
                                    setEditForm((f) => ({ ...f, price_per_ton: Number(e.target.value) }))
                                  }
                                  className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#3b82f6] focus:outline-none"
                                />
                              ) : (
                                <span>{tier.price_per_ton.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editForm.effective_date ?? tier.effective_date}
                                  onChange={(e) =>
                                    setEditForm((f) => ({ ...f, effective_date: e.target.value }))
                                  }
                                  className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#3b82f6] focus:outline-none"
                                />
                              ) : (
                                <span>{tier.effective_date}</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => saveTier(tier)}
                                    disabled={saving}
                                    className="flex items-center gap-1 rounded bg-[#10b981] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#059669] disabled:opacity-50"
                                  >
                                    <Save className="h-3 w-3" />
                                    保存
                                  </button>
                                  <button
                                    onClick={cancelEditTier}
                                    className="flex items-center gap-1 rounded bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300"
                                  >
                                    <X className="h-3 w-3" />
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditTier(tier)}
                                  className="flex items-center gap-1 rounded bg-[#3b82f6] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2563eb]"
                                >
                                  <Pencil className="h-3 w-3" />
                                  编辑
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1e3a5f]">用户列表</h3>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb]"
            >
              <Plus className="h-4 w-4" />
              添加用户
            </button>
          </div>

          {showAddUser && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#1e3a5f]">新增用户</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  placeholder="用户名"
                  value={newUser.username}
                  onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
                <input
                  placeholder="姓名"
                  value={newUser.name}
                  onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value as UserRole }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                >
                  <option value="">选择角色</option>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <input
                  type="password"
                  placeholder="密码"
                  value={newUser.password}
                  onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newUser.username || !newUser.name || !newUser.role || !newUser.password}
                  className="rounded-md bg-[#10b981] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingUser ? '添加中...' : '确认添加'}
                </button>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUser({ username: '', name: '', role: '', password: '' });
                  }}
                  className="rounded-md bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">用户名</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">姓名</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">角色</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">创建时间</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-700">{user.username}</td>
                    <td className="px-4 py-2 text-gray-700">{user.name}</td>
                    <td className="px-4 py-2">
                      <span className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        user.role === 'admin'
                          ? 'bg-red-100 text-red-700'
                          : user.role === 'supervisor'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      )}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{user.created_at}</td>
                    <td className="px-4 py-2 text-gray-400">—</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      暂无用户数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
