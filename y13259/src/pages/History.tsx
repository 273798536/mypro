import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  Merge,
  User,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BookOpen,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useHistoryStore } from '@/store/useHistoryStore';
import { usePublicListStore } from '@/store/usePublicListStore';
import { useGisStore } from '@/store/useGisStore';
import Empty from '@/components/Empty';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/services/traceService';
import { getStatusBgClass } from '@/services/detectionService';
import type { HistoryActionType, HistoryRecord } from '@/types';

type FilterType = 'all' | HistoryActionType;
type TabType = 'all' | 'shift';

export default function History() {
  const { records, loading, selectedRecordId, fetchRecords, selectRecord, getShiftRecords } = useHistoryStore();
  const { items, fetchItems } = usePublicListStore();
  const { points, fetchPoints } = useGisStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchItems();
    fetchPoints();
  }, [fetchRecords, fetchItems, fetchPoints]);

  const shiftRecords = useMemo(() => getShiftRecords(), [records, getShiftRecords]);

  const shiftBriefing = useMemo(() => {
    const pendingItems = items.filter(i => i.status !== 'normal');
    const pendingComplaints = items.filter(i => i.status === 'complaint').length;
    const conflicts = points.filter(p => p.status === 'conflict').length;
    
    return {
      totalProcessed: shiftRecords.length,
      pendingItems: pendingItems.length,
      pendingComplaints,
      conflicts,
      needAttention: pendingItems.slice(0, 5),
    };
  }, [shiftRecords, items, points]);

  const displayRecords = activeTab === 'shift' ? shiftRecords : records;

  const filteredRecords = displayRecords.filter(record => {
    if (filterType !== 'all' && record.actionType !== filterType) return false;
    if (dateFilter && !record.createdAt.startsWith(dateFilter)) return false;
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      return (
        record.explanation.toLowerCase().includes(searchLower) ||
        record.operator.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getActionIcon = (actionType: HistoryActionType) => {
    switch (actionType) {
      case 'confirm':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'reject':
        return <XCircle className="w-5 h-5 text-danger-500" />;
      case 'merge':
        return <Merge className="w-5 h-5 text-blue-500" />;
    }
  };

  const getActionLabel = (actionType: HistoryActionType) => {
    switch (actionType) {
      case 'confirm':
        return '确认通过';
      case 'reject':
        return '退回重报';
      case 'merge':
        return '归并投诉';
    }
  };

  const getActionBgClass = (actionType: HistoryActionType) => {
    switch (actionType) {
      case 'confirm':
        return 'bg-success-50 border-success-200';
      case 'reject':
        return 'bg-danger-50 border-danger-200';
      case 'merge':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const stats = {
    total: records.length,
    confirm: records.filter(r => r.actionType === 'confirm').length,
    reject: records.filter(r => r.actionType === 'reject').length,
    merge: records.filter(r => r.actionType === 'merge').length,
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'confirm', label: '确认通过' },
    { value: 'reject', label: '退回重报' },
    { value: 'merge', label: '归并投诉' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-4">
          <Clock className="w-8 h-8 text-municipal-500 animate-pulse" />
          <p className="text-gray-500">加载历史记录中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Clock className="w-7 h-7 text-municipal-500" />
              历史复盘
            </h1>
            <p className="mt-1 text-gray-500">操作全链路留痕，换班交接有据可依</p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                activeTab === 'all' ? 'bg-white text-municipal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <BookOpen className="w-4 h-4" />
              全部记录
            </button>
            <button
              onClick={() => setActiveTab('shift')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                activeTab === 'shift' ? 'bg-white text-municipal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Users className="w-4 h-4" />
              换班交接
            </button>
          </div>
        </div>

        {activeTab === 'all' && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">操作类型：</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {filterOptions.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    filterType === filter.value
                      ? 'bg-municipal-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {filter.label}
                  <span className="ml-1 text-xs opacity-75">
                    ({filter.value === 'all'
                      ? stats.total
                      : filter.value === 'confirm'
                      ? stats.confirm
                      : filter.value === 'reject'
                      ? stats.reject
                      : stats.merge})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">日期：</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
            />
          </div>

          <div className="flex-1 min-w-[240px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索说明内容、操作人..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
              />
            </div>
          </div>
        </div>
        )}

        {activeTab === 'shift' && (
          <div className="mt-6 bg-municipal-50 border border-municipal-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-municipal-500 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-municipal-900">换班交接说明</h3>
                <p className="text-municipal-700 mt-1">以下是今日处理情况汇总，供现场老师了解最新进展。所有操作均已留痕，可在"全部记录"中查看完整历史。</p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-municipal-100">
                    <p className="text-xs text-municipal-600">今日已处理</p>
                    <p className="text-2xl font-bold text-municipal-700">{shiftBriefing.totalProcessed}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-warning-200">
                    <p className="text-xs text-warning-600">待复核</p>
                    <p className="text-2xl font-bold text-warning-600">{shiftBriefing.pendingItems}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-complaint-200">
                    <p className="text-xs text-complaint-600">待处理投诉</p>
                    <p className="text-2xl font-bold text-complaint-600">{shiftBriefing.pendingComplaints}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-danger-200">
                    <p className="text-xs text-danger-600">点位冲突</p>
                    <p className="text-2xl font-bold text-danger-600">{shiftBriefing.conflicts}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {activeTab === 'shift' && shiftBriefing.needAttention.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning-500" />
              待关注事项（请现场老师留意）
            </h3>
            <div className="grid gap-4">
              {shiftBriefing.needAttention.map((item) => {
                const point = points.find(p => p.id === item.gisPointId);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'p-4 rounded-xl border-l-4',
                      getStatusBgClass(item.status)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <StatusBadge status={item.status} />
                          <span className="font-medium text-gray-900">{item.schoolName}</span>
                          <span className="text-sm text-gray-500">{point?.street || '未知街口'}</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.remark}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          接送时间：{item.pickupTime} | 实际人数：{item.actualCount}/{item.capacity}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'shift' && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-municipal-500" />
            今日操作记录
          </h3>
        )}

        {filteredRecords.length === 0 ? (
          <Empty
            icon={<Clock className="w-12 h-12 text-gray-300" />}
            title={activeTab === 'shift' ? '今日暂无操作记录' : '暂无历史记录'}
            description={activeTab === 'shift' ? '完成复核操作后会自动记录到交班清单' : '当前筛选条件下没有操作记录'}
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredRecords.map((record) => {
                const isExpanded = selectedRecordId === record.id;

                return (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={cn(
                      'bg-white rounded-xl border shadow-sm overflow-hidden',
                      'hover:shadow-md transition-shadow'
                    )}
                  >
                    <div
                      className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => selectRecord(isExpanded ? null : record.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                            getActionBgClass(record.actionType)
                          )}>
                            {getActionIcon(record.actionType)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                record.actionType === 'confirm' && 'bg-success-100 text-success-700',
                                record.actionType === 'reject' && 'bg-danger-100 text-danger-700',
                                record.actionType === 'merge' && 'bg-blue-100 text-blue-700'
                              )}>
                                {getActionLabel(record.actionType)}
                              </span>
                              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                <User className="w-4 h-4 text-gray-400" />
                                {record.operator}
                              </div>
                              <div className="text-sm text-gray-400">
                                {formatDate(record.createdAt)}
                              </div>
                            </div>

                            <p className="text-gray-700 line-clamp-2">
                              {record.explanation}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100 bg-gray-50 p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">操作前数据</h4>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                                    {JSON.stringify(record.beforeData, null, 2)}
                                  </pre>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-gray-700">操作后数据</h4>
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-municipal-200">
                                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                                    {JSON.stringify(record.afterData, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">完整说明</h4>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="text-gray-700 whitespace-pre-wrap">{record.explanation}</p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                              <span>记录ID：</span>
                              <code className="font-mono">{record.id}</code>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
