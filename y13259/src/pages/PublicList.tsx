import { useEffect, useMemo, useState } from 'react';
import { MapPin, Calculator, AlertTriangle, Search, Clock, Users, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { usePublicListStore } from '@/store/usePublicListStore';
import { useGisStore } from '@/store/useGisStore';
import { navigateToGisPoint, formatDate } from '@/services/traceService';
import { getStatusBgClass, getOverCapacityPercentage } from '@/services/detectionService';
import StatusBadge from '@/components/StatusBadge';
import TracePanel from '@/components/TracePanel';
import type { PublicListItemStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusOptions: Array<{ value: PublicListItemStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'normal', label: '正常' },
  { value: 'abnormal', label: '异常' },
  { value: 'over_capacity', label: '容量超限' },
  { value: 'complaint', label: '有投诉' },
];

const getStatusBorderClass = (status: string): string => {
  const classes: Record<string, string> = {
    normal: 'bg-municipal-500',
    abnormal: 'bg-warning-500',
    over_capacity: 'bg-danger-500',
    complaint: 'bg-complaint-500',
  };
  return classes[status] || 'bg-gray-500';
};

const getStatusIcon = (status: string) => {
  const icons: Record<string, React.ReactNode> = {
    normal: <CheckCircle className="w-4 h-4 text-success-500" />,
    abnormal: <AlertCircle className="w-4 h-4 text-warning-500" />,
    over_capacity: <AlertTriangle className="w-4 h-4 text-danger-500" />,
    complaint: <MessageSquare className="w-4 h-4 text-complaint-500" />,
  };
  return icons[status] || null;
};

export default function PublicList() {
  const {
    items,
    loading,
    filterStatus,
    selectedItemId,
    fetchItems,
    setFilter,
    selectItem,
  } = usePublicListStore();

  const { getPointById } = useGisStore();

  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const stats = useMemo(() => {
    return {
      normal: items.filter(item => item.status === 'normal').length,
      abnormal: items.filter(item => item.status === 'abnormal').length,
      overCapacity: items.filter(item => item.status === 'over_capacity').length,
      complaint: items.filter(item => item.status === 'complaint').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchText && !item.schoolName.includes(searchText)) return false;
      if (dateRange.start) {
        const itemDate = new Date(item.createdAt);
        const startDate = new Date(dateRange.start);
        if (itemDate < startDate) return false;
      }
      if (dateRange.end) {
        const itemDate = new Date(item.createdAt);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (itemDate > endDate) return false;
      }
      return true;
    });
  }, [items, filterStatus, searchText, dateRange]);

  const handleViewGis = (gisPointId: string) => {
    navigateToGisPoint(gisPointId);
  };

  const handleViewTrace = (itemId: string) => {
    selectItem(itemId);
  };

  const handleCloseTrace = () => {
    selectItem(null);
  };

  const handleProcess = (itemId: string) => {
    console.log('处理条目:', itemId);
  };

  const getStreetByGisPointId = (gisPointId: string): string => {
    const point = getPointById(gisPointId);
    return point?.street || '未知街口';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">学校接送公示清单</h1>
          <p className="mt-2 text-gray-600">异常标记区分，一键回溯数据源</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">状态：</span>
              <div className="flex gap-1">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      filterStatus === option.value
                        ? 'bg-municipal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索学校名称..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">正常</p>
                <p className="mt-1 text-3xl font-bold text-success-600">{stats.normal}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">异常</p>
                <p className="mt-1 text-3xl font-bold text-warning-600">{stats.abnormal}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-warning-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">容量超限</p>
                <p className="mt-1 text-3xl font-bold text-danger-600">{stats.overCapacity}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-danger-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">有投诉</p>
                <p className="mt-1 text-3xl font-bold text-complaint-600">{stats.complaint}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-complaint-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-complaint-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-municipal-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">暂无匹配的公示清单数据</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isSelected = selectedItemId === item.id;
              const isOverCapacity = item.status === 'over_capacity';
              const overPercentage = getOverCapacityPercentage(item);
              const street = getStreetByGisPointId(item.gisPointId);

              return (
                <div
                  key={item.id}
                  onClick={() => selectItem(item.id)}
                  className={cn(
                    'bg-white rounded-xl shadow-sm border-l-4 border transition-all cursor-pointer',
                    'hover:shadow-md hover:-translate-y-0.5',
                    isSelected && 'ring-2 ring-municipal-500 shadow-md',
                    isOverCapacity && getStatusBgClass(item.status),
                    !isOverCapacity && 'border-gray-200',
                    isOverCapacity && 'border-danger-200'
                  )}
                  style={{
                    borderLeftColor: isOverCapacity ? undefined : '',
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        'absolute left-0 top-0 bottom-0 w-1 rounded-l-xl',
                        getStatusBorderClass(item.status)
                      )}
                    />

                    {isOverCapacity && (
                      <div className="absolute right-4 top-4">
                        <AlertTriangle className="w-6 h-6 text-danger-500" />
                      </div>
                    )}

                    <div className="p-6 pl-8">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {item.schoolName}
                            </h3>
                            <StatusBadge status={item.status} />
                            {getStatusIcon(item.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600">{street}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600">{item.pickupTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600">
                                容量：{item.capacity} / 实际：{item.actualCount}
                              </span>
                              {isOverCapacity && overPercentage > 0 && (
                                <span className="font-bold text-danger-600">
                                  (+{overPercentage}%)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span>创建时间：{formatDate(item.createdAt)}</span>
                            {item.remark && (
                              <span className="text-gray-500">备注：{item.remark}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewGis(item.gisPointId);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-municipal-700 bg-municipal-50 rounded-lg hover:bg-municipal-100 transition-colors"
                          >
                            <MapPin className="w-4 h-4" />
                            查看GIS点位
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTrace(item.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Calculator className="w-4 h-4" />
                            查看计算口径
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcess(item.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-municipal-600 rounded-lg hover:bg-municipal-700 transition-colors"
                          >
                            处理
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TracePanel itemId={selectedItemId} onClose={handleCloseTrace} />
    </div>
  );
}
