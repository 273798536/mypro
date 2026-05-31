import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MapPin, Plus, Search, Calendar, Building } from 'lucide-react';
import { useStore } from '@/store';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { CityStatus } from '@/types';

const STATUS_TABS: { label: string; value: CityStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '已排期', value: 'scheduled' },
  { label: '进行中', value: 'in-progress' },
  { label: '已完成', value: 'completed' },
];

interface AddCityForm {
  name: string;
  performanceDate: string;
  venue: string;
  status: CityStatus;
}

const initialForm: AddCityForm = {
  name: '',
  performanceDate: '',
  venue: '',
  status: 'scheduled',
};

export function CityList() {
  const cities = useStore((s) => s.cities);
  const shipments = useStore((s) => s.shipments);
  const addCity = useStore((s) => s.addCity);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CityStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddCityForm>(initialForm);

  const shipmentCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    shipments.forEach((s) => {
      map[s.cityId] = (map[s.cityId] || 0) + 1;
    });
    return map;
  }, [shipments]);

  const filteredCities = useMemo(() => {
    return cities.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.venue.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cities, search, statusFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCity({
      name: form.name,
      performanceDate: new Date(form.performanceDate),
      venue: form.venue,
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
          <MapPin size={28} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-neutral-text">城市场次</h1>
          <span className="text-sm text-gray-500">共 {cities.length} 场</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} />
          新增场次
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索城市或场地..."
            className="w-full pl-10 pr-4 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
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
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">城市</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">演出日期</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">场地</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">状态</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">关联物资</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">创建人</th>
              <th className="px-4 py-3 text-sm font-semibold text-primary-800">操作</th>
            </tr>
          </thead>
          <tbody className="table-zebra">
            {filteredCities.map((city) => (
              <tr
                key={city.id}
                className="border-t border-neutral-border hover:bg-primary-50/40 transition-colors cursor-pointer"
                onClick={() => window.location.href = `/cities/${city.id}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary-500 flex-shrink-0" />
                    <span className="font-medium text-neutral-text">{city.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    {format(new Date(city.performanceDate), 'yyyy-MM-dd', { locale: zhCN })}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Building size={14} className="text-gray-400" />
                    {city.venue}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={city.status} size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {shipmentCountMap[city.id] || 0} 件
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{city.createdBy}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/cities/${city.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
            {filteredCities.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  未找到匹配的城市场次
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-cardHover w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-neutral-text mb-4">新增场次</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">城市名称</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="例如: 上海"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">演出日期</label>
                <input
                  type="date"
                  required
                  value={form.performanceDate}
                  onChange={(e) => setForm((f) => ({ ...f, performanceDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">场地</label>
                <input
                  type="text"
                  required
                  value={form.venue}
                  onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="例如: 梅赛德斯奔驰文化中心"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CityStatus }))}
                  className="w-full px-3 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                >
                  <option value="scheduled">已排期</option>
                  <option value="in-progress">进行中</option>
                  <option value="completed">已完成</option>
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
