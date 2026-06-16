import { useEffect, useState } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { useComplaintStore } from '@/stores/complaintStore';
import type { ComplaintStatus } from '../../shared/types';
import ComplaintCard from '@/components/ComplaintCard';

export default function ComplaintList() {
  const { complaints, total, loading, filters, fetchComplaints, setFilters } = useComplaintStore();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchComplaints();
  }, []);

  const pendingCount = complaints.filter((c) => c.status === 'pending').length;
  const mergedCount = complaints.filter((c) => c.status === 'merged').length;
  const confirmedCount = complaints.filter((c) => c.status === 'confirmed').length;

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value });
  };

  const handleSearch = () => {
    setPage(1);
    fetchComplaints();
  };

  const statusOptions: { value: ComplaintStatus | ''; label: string }[] = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待归并' },
    { value: 'merged', label: '已归并' },
    { value: 'confirmed', label: '已确认' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = complaints.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          投诉列表
        </h2>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          共 {total} 条
        </span>
      </div>

      <div
        className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="搜索关键词..."
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full rounded-lg border py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>至</span>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>

        <button
          onClick={handleSearch}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          搜索
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '总计', count: total, color: 'var(--color-primary)' },
          { label: '待归并', count: pendingCount, color: 'var(--color-accent)' },
          { label: '已归并', count: mergedCount, color: '#3B82F6' },
          { label: '已确认', count: confirmedCount, color: 'var(--color-success)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-4 text-center"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
          >
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          <span className="ml-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中...</span>
        </div>
      ) : paged.length === 0 ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          暂无投诉数据
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {paged.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)' }}
          >
            上一页
          </button>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)' }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
