import { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import ReviewCard from '@/components/ReviewCard';
import type { ReviewStatus } from '@/types';

const statusFilters: { value: ReviewStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待开始' },
  { value: 'processing', label: '进行中' },
  { value: 'anomaly', label: '有异常' },
  { value: 'completed', label: '已完成' },
];

export default function ReviewList() {
  const { reviews, sceneMetas } = useReviewStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');

  const filteredReviews = reviews.filter((review) => {
    const matchSearch =
      review.title.includes(searchText) ||
      review.location.includes(searchText);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'anomaly'
        ? review.hasAnomaly
        : review.status === statusFilter);
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-steel-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-steel-700 mb-2">
            复核任务列表
          </h2>
          <p className="text-sm text-steel-400">
            共 {reviews.length} 个复核任务，其中 {reviews.filter(r => r.hasAnomaly).length} 个存在异常
          </p>
        </div>

        <div className="bg-white rounded-lg border border-steel-100 p-4 mb-6 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
                />
                <input
                  type="text"
                  placeholder="搜索复核任务名称或地点..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-steel-200 rounded-md text-sm text-steel-700 placeholder-steel-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-steel-400" />
              <div className="flex items-center gap-1 bg-steel-50 rounded-md p-1">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      statusFilter === filter.value
                        ? 'bg-white text-primary-600 shadow-sm font-medium'
                        : 'text-steel-500 hover:text-steel-700'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              summary={sceneMetas[review.id]?.pageSummary || '暂无摘要'}
            />
          ))}
        </div>

        {filteredReviews.length === 0 && (
          <div className="text-center py-16 text-steel-400">
            <p>暂无符合条件的复核任务</p>
          </div>
        )}
      </div>
    </div>
  );
}
