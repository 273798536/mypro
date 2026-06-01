import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  RotateCcw,
  Trash2,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  Hash,
  History as HistoryIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { HistoryRecord } from '../../shared/types';

const ACTION_TYPES = [
  { value: 'all', label: '全部操作' },
  { value: 'add', label: '添加产品' },
  { value: 'update', label: '更新产品' },
  { value: 'delete', label: '删除产品' },
  { value: 'import', label: '导入数据' },
  { value: 'restore', label: '恢复历史' },
];

const TIME_RANGES = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '近一周' },
  { value: 'month', label: '近一月' },
  { value: 'quarter', label: '近三月' },
];

const PAGE_SIZE = 10;

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

function truncateChecksum(checksum: string): string {
  return checksum.slice(0, 8);
}

function isInTimeRange(timestamp: number, range: string): boolean {
  const now = Date.now();
  const diff = now - timestamp;

  switch (range) {
    case 'today':
      return diff < 86400000;
    case 'week':
      return diff < 604800000;
    case 'month':
      return diff < 2592000000;
    case 'quarter':
      return diff < 7776000000;
    default:
      return true;
  }
}

interface HistoryRowProps {
  record: HistoryRecord;
  onRestore: (record: HistoryRecord) => void;
  onDelete: (id: string) => void;
}

function HistoryRow({ record, onRestore, onDelete }: HistoryRowProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRestore = () => {
    setIsRestoring(true);
    setTimeout(() => {
      onRestore(record);
      setIsRestoring(false);
    }, 500);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(record.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <tr
      className={cn(
        'group border-b border-white/5 transition-colors hover:bg-cyber-500/5'
      )}
    >
      <td className="px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="font-mono">{formatTimestamp(record.timestamp)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-1 ml-6">
        {formatDate(record.timestamp)}
      </div>
    </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-cyber-500/10 text-cyber-400 border border-cyber-500/20">
          {record.action}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Package className="w-4 h-4 text-gray-500" />
          <span>{record.productIds.length}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-gray-500" />
          <code className="text-sm font-mono text-cyber-400 bg-space-700 px-2 py-1 rounded">
            {truncateChecksum(record.checksum)}
          </code>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              'bg-trust-500/10 text-trust-400 border border-trust-500/20',
              'hover:bg-trust-500/20 hover:border-trust-500/40',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RotateCcw className={cn('w-3.5 h-3.5', isRestoring && 'animate-spin')} />
            {isRestoring ? '恢复中...' : '恢复'}
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              showDeleteConfirm
                ? 'bg-risk-500/30 text-risk-400 border border-risk-500/50'
                : 'bg-risk-500/10 text-risk-400 border border-risk-500/20 hover:bg-risk-500/20 hover:border-risk-500/40'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {showDeleteConfirm ? '确认删除' : '删除'}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function History() {
  const { history, restoreFromHistory, deleteHistory } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredHistory = useMemo(() => {
    return history.filter((record) => {
      if (actionFilter !== 'all' && !record.action.includes(actionFilter)) {
        return false;
      }

      if (timeRange !== 'all' && !isInTimeRange(record.timestamp, timeRange)) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          record.action.toLowerCase().includes(query) ||
          record.checksum.toLowerCase().includes(query) ||
          formatTimestamp(record.timestamp).toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [history, actionFilter, timeRange, searchQuery]);

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, currentPage]);

  const handleRestore = (record: HistoryRecord) => {
    restoreFromHistory(record);
  };

  const handleDelete = async (id: string) => {
    await deleteHistory(id);
    if (paginatedData.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleFilterChange = (type: 'action' | 'time', value: string) => {
    if (type === 'action') {
      setActionFilter(value);
    } else {
      setTimeRange(value);
    }
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-900 via-space-800 to-space-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyber-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyber-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <HistoryIcon className="w-8 h-8 text-cyber-400" />
                历史记录
              </h1>
              <p className="text-gray-400 mt-2">
                共 {history.length} 条记录
                {(actionFilter !== 'all' || timeRange !== 'all' || searchQuery) && (
                  <span className="text-cyber-400">
                    {' '}· 筛选后 {filteredHistory.length} 条
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="搜索操作描述或校验和..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-space-700/50 border border-space-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={actionFilter}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="bg-space-700/50 border border-space-600 rounded-lg px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors cursor-pointer"
                >
                  {ACTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={timeRange}
                  onChange={(e) => handleFilterChange('time', e.target.value)}
                  className="bg-space-700/50 border border-space-600 rounded-lg px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors cursor-pointer"
                >
                  {TIME_RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-space-700/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    时间戳
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    操作描述
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    产品数量
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    校验和
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedData.length > 0 ? (
                  paginatedData.map((record) => (
                    <HistoryRow
                      key={record.id}
                      record={record}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <HistoryIcon className="w-12 h-12 text-gray-600" />
                          <p className="text-gray-400 text-sm">
                            {history.length === 0
                              ? '暂无历史记录'
                              : '没有匹配的历史记录'}
                          </p>
                          {history.length > 0 && (
                            <p className="text-gray-500 text-xs">
                              尝试调整筛选条件或清空搜索
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-white/5">
              <div className="text-sm text-gray-500">
                显示 {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
                {Math.min(currentPage * PAGE_SIZE, filteredHistory.length)} 条，共{' '}
                {filteredHistory.length} 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-space-700/50 border border-space-600 hover:bg-space-700 hover:border-cyber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                          currentPage === page
                            ? 'bg-cyber-500/20 text-cyber-400 border border-cyber-500/40'
                            : 'bg-space-700/50 text-gray-400 border border-transparent hover:bg-space-700 hover:border-space-600'
                        )}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-space-700/50 border border-space-600 hover:bg-space-700 hover:border-cyber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
