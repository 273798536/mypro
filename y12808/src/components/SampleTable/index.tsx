import { Search, Filter, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import type { Sample } from '@/types';
import { SampleStatus } from '@/types';
import StatusTag from '@/components/StatusTag';
import { useSampleStore } from '@/store/sampleStore';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SampleTableProps {
  onSelectSample: (sampleId: string) => void;
}

export default function SampleTable({ onSelectSample }: SampleTableProps) {
  const {
    getFilteredSamples,
    searchKeyword,
    setSearchKeyword,
    statusFilter,
    setStatusFilter
  } = useSampleStore();

  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDesc, setSortDesc] = useState(true);

  const samples = getFilteredSamples();

  const sortedSamples = [...samples].sort((a, b) => {
    let aVal: string | number = a[sortField as keyof Sample] || '';
    let bVal: string | number = b[sortField as keyof Sample] || '';

    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      aVal = new Date(aVal as string).getTime();
      bVal = new Date(bVal as string).getTime();
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDesc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }

    return sortDesc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: SampleStatus.PENDING, label: '待检测' },
    { value: SampleStatus.TESTING, label: '检测中' },
    { value: SampleStatus.COMPLETED, label: '已完成' },
    { value: SampleStatus.ABNORMAL, label: '异常' }
  ];

  const stats = {
    total: samples.length,
    pending: samples.filter((s) => s.status === SampleStatus.PENDING).length,
    testing: samples.filter((s) => s.status === SampleStatus.TESTING).length,
    completed: samples.filter((s) => s.status === SampleStatus.COMPLETED).length,
    abnormal: samples.filter((s) => s.status === SampleStatus.ABNORMAL).length
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDesc ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索条码、名称、批次号..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 text-sm bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SampleStatus | 'all')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 bg-white"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          {[
            { label: '总计', value: stats.total, color: 'slate' },
            { label: '待检测', value: stats.pending, color: 'slate' },
            { label: '检测中', value: stats.testing, color: 'blue' },
            { label: '已完成', value: stats.completed, color: 'emerald' },
            { label: '异常', value: stats.abnormal, color: 'rose' }
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  stat.color === 'slate' && 'bg-slate-400',
                  stat.color === 'blue' && 'bg-blue-500',
                  stat.color === 'emerald' && 'bg-emerald-500',
                  stat.color === 'rose' && 'bg-rose-500'
                )}
              />
              <span className="text-sm text-slate-500">
                {stat.label}:{' '}
                <span className="font-semibold text-slate-700">{stat.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('barcode')}
              >
                <div className="flex items-center gap-1">
                  条码
                  <SortIcon field="barcode" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  名称
                  <SortIcon field="name" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                批次
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('updatedAt')}
              >
                <div className="flex items-center gap-1">
                  更新时间
                  <SortIcon field="updatedAt" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedSamples.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  暂无匹配的样本
                </td>
              </tr>
            ) : (
              sortedSamples.map((sample) => (
                <tr
                  key={sample.id}
                  className="hover:bg-cyan-50/30 transition-colors cursor-pointer"
                  onClick={() => onSelectSample(sample.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-sm font-medium text-slate-800">
                      {sample.barcode}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-700">
                      {sample.name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">{sample.sampleType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusTag status={sample.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-500">{sample.batchNo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-500">
                      {new Date(sample.updatedAt).toLocaleDateString('zh-CN')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSample(sample.id);
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
