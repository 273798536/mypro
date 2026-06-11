import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useAppStore } from '@/store/useAppStore';
import type { PointStatus } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'processed', label: '已处理' },
  { value: 'pending_material', label: '待补材料' },
  { value: 'manual_overruled', label: '人工改判' },
  { value: 'withdrawn', label: '已撤回' },
  { value: 'suspended', label: '挂起' },
];

export default function PointTable() {
  const navigate = useNavigate();
  const {
    getFilteredPoints,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
  } = useAppStore();

  const points = getFilteredPoints();

  const handleRowClick = (id: string) => {
    navigate(`/point/${id}`);
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-sea-mist-dark flex flex-col h-full">
      <div className="p-4 border-b border-sea-mist-dark">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="搜索点位编号、上报人、备注..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-deep-sea focus:ring-1 focus:ring-deep-sea/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" strokeWidth={1.8} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-deep-sea bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            共 <strong className="text-deep-sea">{points.length}</strong> 个点位
          </span>
          <span className="text-gray-300">|</span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-processed-green mr-1 align-middle" />已处理
            <strong className="ml-1 text-gray-700">
              {points.filter((p) => p.status === 'processed').length}
            </strong>
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-suspended-red mr-1 align-middle" />挂起
            <strong className="ml-1 text-gray-700">
              {points.filter((p) => p.status === 'suspended').length}
            </strong>
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-withdrawn-gray mr-1 align-middle" />已撤回
            <strong className="ml-1 text-gray-700">
              {points.filter((p) => p.status === 'withdrawn').length}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-sea-mist/60 sticky top-0 z-10">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                点位编号
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                坐标
                <span className="field-source-tag bg-blue-50 text-blue-700 border border-blue-100">
                  unified
                </span>
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">风速 (m/s)</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">上报人</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">处理状态</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">字段来源</th>
              <th className="px-4 py-3 font-medium">备注</th>
              <th className="px-4 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, idx) => (
              <tr
                key={p.id}
                onClick={() => handleRowClick(p.id)}
                className={`border-t border-gray-100 cursor-pointer hover:bg-deep-sea/5 transition-colors group ${
                  idx % 2 === 1 ? 'bg-gray-50/50' : ''
                } ${p.status === 'withdrawn' ? 'opacity-60 line-through decoration-gray-300' : ''}`}
              >
                <td className="px-4 py-3 font-mono-data font-medium text-deep-sea">
                  {p.id}
                </td>
                <td className="px-4 py-3 font-mono-data text-xs text-gray-700 whitespace-nowrap">
                  {p.lng.toFixed(4)}, {p.lat.toFixed(4)}
                </td>
                <td className="px-4 py-3 font-mono-data">
                  {p.windSpeed > 0 ? p.windSpeed.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{p.reporter}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status as PointStatus} />
                </td>
                <td className="px-4 py-3">
                  {p.fieldSource === 'original' ? (
                    <span className="field-source-tag bg-green-50 text-green-700 border border-green-100">
                      原始字段
                    </span>
                  ) : (
                    <span className="field-source-tag bg-amber-50 text-amber-700 border border-amber-100">
                      已映射
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[280px] truncate">
                  {p.note}
                </td>
                <td className="px-4 py-3">
                  <ChevronRight
                    className="w-4 h-4 text-gray-400 group-hover:text-deep-sea transition-colors"
                    strokeWidth={2}
                  />
                </td>
              </tr>
            ))}
            {points.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                  未找到匹配的点位
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
