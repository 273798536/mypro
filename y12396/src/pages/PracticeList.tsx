import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Filter, Music, Inbox } from 'lucide-react';
import { usePracticeStore } from '@/store/practiceStore';
import StatusBadge from '@/components/StatusBadge';

const statusStripColors: Record<string, string> = {
  normal: 'bg-correction-green',
  conflict: 'bg-conflict-red',
  corrected: 'bg-amber-primary',
  pending: 'bg-pending-yellow',
};

export default function PracticeList() {
  const navigate = useNavigate();
  const { practices, total, loading, filters, page, pageSize, fetchPractices, setFilters, setPage } = usePracticeStore();

  const loadData = useCallback(() => {
    fetchPractices();
  }, [fetchPractices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = () => {
    setPage(1);
    fetchPractices();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary mb-1">练习列表</h2>
        <p className="text-sm text-text-muted">查看和管理所有鼓手练习记录</p>
      </div>

      <div className="bg-dark-card rounded-xl border border-dark-border p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-text-muted mb-1.5">学生姓名</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={filters.studentName}
                onChange={(e) => setFilters({ studentName: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="搜索学生姓名..."
                className="w-full pl-9 pr-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs text-text-muted mb-1.5">开始日期</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ dateFrom: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-amber-primary transition-colors"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs text-text-muted mb-1.5">结束日期</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ dateTo: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-amber-primary transition-colors"
              />
            </div>
          </div>

          <div className="min-w-[130px]">
            <label className="block text-xs text-text-muted mb-1.5">状态</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-amber-primary transition-colors appearance-none"
              >
                <option value="">全部</option>
                <option value="normal">正常</option>
                <option value="conflict">冲突</option>
                <option value="corrected">已修正</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="px-5 py-2 bg-amber-primary hover:bg-amber-hover text-dark-primary font-semibold text-sm rounded-lg shadow-lg shadow-amber-primary/20 transition-all duration-200 hover:shadow-amber-hover/30"
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-amber-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : practices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Inbox className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">暂无练习记录</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {practices.map((practice) => (
              <div
                key={practice.id}
                onClick={() => navigate(`/practices/${practice.id}`)}
                className="bg-dark-card rounded-xl border border-dark-border overflow-hidden cursor-pointer hover:border-amber-primary/40 transition-all duration-200 group"
              >
                <div className="flex h-full">
                  <div className={`w-1 flex-shrink-0 ${statusStripColors[practice.status] || 'bg-text-muted'}`} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display font-semibold text-text-primary group-hover:text-amber-primary transition-colors">
                        {practice.studentName}
                      </h3>
                      <StatusBadge status={practice.status} size="sm" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{practice.practiceDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Music className="w-3.5 h-3.5" />
                        <span>{practice.audioFileName}</span>
                      </div>
                    </div>
                    {practice.conflictCount > 0 && (
                      <div className="mt-3 text-xs text-conflict-red">
                        {practice.conflictCount} 个冲突待处理
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => { setPage(page - 1); fetchPractices(); }}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm bg-dark-tertiary text-text-secondary hover:bg-dark-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <span className="text-sm text-text-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => { setPage(page + 1); fetchPractices(); }}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm bg-dark-tertiary text-text-secondary hover:bg-dark-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
