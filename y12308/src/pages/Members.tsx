import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, AlertTriangle, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { cn } from '../lib/utils';
import { MemberStatus } from '../types';

type SortField = 'churnProbability' | 'registerDate' | 'lastActiveDate';
type SortOrder = 'desc' | 'asc';

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: MemberStatus.active, label: '活跃' },
  { value: MemberStatus.at_risk, label: '高危' },
  { value: MemberStatus.silent, label: '沉默' },
  { value: MemberStatus.churned, label: '流失' },
  { value: MemberStatus.new, label: '新会员' },
  { value: MemberStatus.reactivated, label: '回流' },
];

const sortOptions = [
  { value: 'churnProbability', label: '流失概率降序', order: 'desc' as SortOrder },
  { value: 'registerDate', label: '注册日期', order: 'desc' as SortOrder },
  { value: 'lastActiveDate', label: '最近活跃日期', order: 'desc' as SortOrder },
];

const PAGE_SIZE = 20;

const Members: React.FC = () => {
  const navigate = useNavigate();
  const { members } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagConflictOnly, setTagConflictOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('churnProbability');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedMembers = useMemo(() => {
    let result = [...members];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.phone.includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((m) => m.currentStatus === statusFilter);
    }

    if (tagConflictOnly) {
      result = result.filter((m) => m.tagConflict);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'churnProbability') {
        comparison = a.churnProbability - b.churnProbability;
      } else if (sortField === 'registerDate') {
        comparison =
          new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime();
      } else if (sortField === 'lastActiveDate') {
        comparison =
          new Date(a.lastActiveDate).getTime() - new Date(b.lastActiveDate).getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [members, searchQuery, statusFilter, tagConflictOnly, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedMembers.length / PAGE_SIZE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedMembers.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedMembers, currentPage]);

  const handleSortChange = (value: string) => {
    const option = sortOptions.find((o) => o.value === value);
    if (option) {
      setSortField(option.value as SortField);
      setSortOrder(option.order);
    }
  };

  const getChurnProbabilityColor = (probability: number) => {
    if (probability > 0.6) return 'bg-gradient-to-r from-red-400 to-red-600';
    if (probability > 0.3) return 'bg-gradient-to-r from-yellow-400 to-amber-500';
    return 'bg-gradient-to-r from-green-400 to-emerald-500';
  };

  const getChurnProbabilityTextColor = (probability: number) => {
    if (probability > 0.6) return 'text-red-600';
    if (probability > 0.3) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={cn(
        'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
        currentPage === i
          ? 'bg-blue-600 text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      )}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">会员明细</h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {filteredAndSortedMembers.length} 条记录
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="搜索会员姓名或手机号"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-gray-400" />
              <select
                value={sortField}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={tagConflictOnly}
                onChange={(e) => {
                  setTagConflictOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">标签冲突</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  姓名
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  手机号
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  当前状态
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  注册日期
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  最近活跃
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  订单数
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  消费金额
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  流失概率
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((member, index) => (
                <tr
                  key={member.id}
                  className={cn(
                    'border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer',
                    index % 2 === 1 ? 'bg-gray-50/50' : ''
                  )}
                  onClick={() => navigate(`/members/${member.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {member.name}
                      </span>
                      {member.tagConflict && (
                        <div className="relative group">
                          <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center animate-pulse">
                            <AlertTriangle
                              size={12}
                              className="text-yellow-600"
                            />
                          </div>
                          <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            标签不一致
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.phone}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={member.currentStatus} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(member.registerDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(member.lastActiveDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {member.totalOrders}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(member.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[80px]">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              getChurnProbabilityColor(member.churnProbability)
                            )}
                            style={{
                              width: `${Math.round(member.churnProbability * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold w-12 text-right',
                          getChurnProbabilityTextColor(member.churnProbability)
                        )}
                      >
                        {Math.round(member.churnProbability * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/members/${member.id}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Eye size={14} />
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedMembers.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">暂无符合条件的会员数据</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              共 {filteredAndSortedMembers.length} 条记录，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {renderPageNumbers()}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Members;
