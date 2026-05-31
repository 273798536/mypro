import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Plus, Filter, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { BoxStatus } from '@/types';

const STATUS_TABS: { label: string; value: BoxStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '待发货', value: 'pending' },
  { label: '运输中', value: 'transit' },
  { label: '已到达', value: 'arrived' },
  { label: '已签收', value: 'signed' },
];

interface AddBoxForm {
  boxNumber: string;
  description: string;
  weight: string;
  volume: string;
  status: BoxStatus;
}

const initialForm: AddBoxForm = {
  boxNumber: '',
  description: '',
  weight: '',
  volume: '',
  status: 'pending',
};

export function BoxList() {
  const boxes = useStore((s) => s.boxes);
  const addBox = useStore((s) => s.addBox);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoxStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddBoxForm>(initialForm);

  const duplicateBoxNumbers = useMemo(() => {
    const countMap: Record<string, number> = {};
    boxes.forEach((b) => {
      countMap[b.boxNumber] = (countMap[b.boxNumber] || 0) + 1;
    });
    return new Set(Object.entries(countMap).filter(([, c]) => c > 1).map(([n]) => n));
  }, [boxes]);

  const filteredBoxes = useMemo(() => {
    return boxes.filter((b) => {
      const matchesSearch =
        !search ||
        b.boxNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [boxes, search, statusFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBox({
      boxNumber: form.boxNumber,
      description: form.description,
      weight: Number(form.weight),
      volume: Number(form.volume),
      status: form.status,
      createdBy: useStore.getState().currentUser.name,
    });
    setForm(initialForm);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-neutral-text">物资清单</h1>
          <span className="text-sm text-gray-500">共 {boxes.length} 件</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          添加物资
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索箱号或描述..."
            className="w-full pl-10 pr-4 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-neutral-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-primary-50 text-left">
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">箱号</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">描述</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">重量</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">体积</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">状态</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">保险</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">创建人</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">操作</th>
            </tr>
          </thead>
          <tbody className="table-zebra">
            {filteredBoxes.map((box) => {
              const isDuplicate = duplicateBoxNumbers.has(box.boxNumber);
              return (
                <tr
                  key={box.id}
                  className={`border-t border-neutral-border hover:bg-primary-50/40 transition-colors ${
                    isDuplicate ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isDuplicate && (
                        <AlertTriangle size={16} className="text-accent-danger flex-shrink-0" />
                      )}
                      <span className={`font-medium ${isDuplicate ? 'text-accent-danger' : ''}`}>
                        {box.boxNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{box.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {box.weight} <span className="text-gray-400">kg</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {box.volume} <span className="text-gray-400">m³</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={box.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {box.insurance ? box.insurance.policyNumber : (
                      <span className="text-gray-400">无</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{box.createdBy}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/boxes/${box.id}`}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filteredBoxes.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  未找到匹配的物资
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-cardHover w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-neutral-text mb-4">添加物资</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">箱号</label>
                <input
                  type="text"
                  required
                  value={form.boxNumber}
                  onChange={(e) => setForm((f) => ({ ...f, boxNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="例如: INST-008"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="物资描述"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">重量 (kg)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={form.weight}
                    onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">体积 (m³)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={form.volume}
                    onChange={(e) => setForm((f) => ({ ...f, volume: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BoxStatus }))}
                  className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                >
                  <option value="pending">待发货</option>
                  <option value="transit">运输中</option>
                  <option value="arrived">已到达</option>
                  <option value="signed">已签收</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm(initialForm);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
