import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Upload,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Activity,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/ui/StatusBadge';
import type { SampleStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusFilters: { value: SampleStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待估算' },
  { value: 'estimating', label: '估算中' },
  { value: 'estimated', label: '已估算' },
  { value: 'corrected', label: '已修正' },
  { value: 'confirmed', label: '已确认' },
  { value: 'anomaly', label: '异常' },
];

export default function SampleList() {
  const navigate = useNavigate();
  const samples = useAppStore((state) => state.samples);
  const groups = useAppStore((state) => state.groups);
  const getGroupById = useAppStore((state) => state.getGroupById);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'barcode' | 'positiveRate'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredSamples = samples
    .filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (groupFilter !== 'all' && s.groupId !== groupFilter) return false;
      if (searchQuery && !s.barcode.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'barcode':
          comparison = a.barcode.localeCompare(b.barcode);
          break;
        case 'positiveRate':
          comparison = (a.latestPositiveRate || 0) - (b.latestPositiveRate || 0);
          break;
        case 'updatedAt':
        default:
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getRateColor = (rate?: number) => {
    if (!rate) return 'text-slate-400';
    if (rate >= 50) return 'text-accent-600';
    if (rate >= 20) return 'text-brand-600';
    if (rate >= 5) return 'text-warning-600';
    return 'text-slate-600';
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">样本管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {filteredSamples.length} 个样本
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <Upload className="w-4 h-4 mr-2" />
            批量导入
          </button>
          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            新建样本
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索样本条码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-ghost">
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </button>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="select w-40"
            >
              <option value="all">全部分组</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                statusFilter === filter.value
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {filter.label}
              <span className="ml-1.5 opacity-60">
                ({filter.value === 'all'
                  ? samples.length
                  : samples.filter((s) => s.status === filter.value).length})
              </span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>排序:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input-sm input w-32"
            >
              <option value="updatedAt">更新时间</option>
              <option value="barcode">样本条码</option>
              <option value="positiveRate">阳性率</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded hover:bg-slate-100"
            >
              {sortOrder === 'desc' ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4 rotate-270" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  样本条码
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  分组
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  诊断
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  阳性率
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  版本
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  更新时间
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.map((sample, index) => {
                const group = getGroupById(sample.groupId);
                return (
                  <tr
                    key={sample.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 20}ms` }}
                    onClick={() => navigate(`/samples/${sample.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-slate-800">
                          {sample.barcode}
                        </span>
                        {sample.hasAnomaly && (
                          <AlertTriangle className="w-4 h-4 text-warning-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group?.color }}
                        />
                        <span className="text-sm text-slate-700">{group?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {sample.patientInfo.diagnosis || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sample.latestPositiveRate !== undefined ? (
                        <span
                          className={cn(
                            'font-serif font-bold text-lg',
                            getRateColor(sample.latestPositiveRate)
                          )}
                        >
                          {sample.latestPositiveRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sample.currentVersion > 0 ? (
                        <span className="text-sm text-slate-600">
                          v{sample.currentVersion}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={sample.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(sample.updatedAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/samples/${sample.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/samples/${sample.id}/estimation`);
                          }}
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSamples.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-slate-400 text-sm">暂无符合条件的样本</div>
          </div>
        )}
      </div>
    </div>
  );
}
