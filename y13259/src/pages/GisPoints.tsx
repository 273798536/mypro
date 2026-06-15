import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Eye,
  CheckCircle,
  Database,
  X,
} from 'lucide-react';
import { useGisStore } from '@/store/useGisStore';
import { usePublicListStore } from '@/store/usePublicListStore';
import StatusBadge from '@/components/StatusBadge';
import RawDataPanel from '@/components/RawDataPanel';
import ConflictAlert from '@/components/ConflictAlert';
import { cn } from '@/lib/utils';
import type { GisPointStatus, ConflictGroup } from '@/types';

type FilterStatus = 'all' | GisPointStatus;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function GisPoints() {
  const {
    points,
    loading,
    selectedPointId,
    highlightPointId,
    fetchPoints,
    selectPoint,
    highlightPoint,
    getConflictGroups,
    updatePointStatus,
    detectConflicts,
  } = useGisStore();

  const { items: publicListItems, fetchItems } = usePublicListStore();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null);
  const [conflictAlertOpen, setConflictAlertOpen] = useState(false);
  const [selectedConflictGroup, setSelectedConflictGroup] = useState<ConflictGroup | null>(null);

  const conflictGroups = getConflictGroups();

  useEffect(() => {
    fetchPoints();
    fetchItems();
  }, [fetchPoints, fetchItems]);

  useEffect(() => {
    getConflictGroups();
  }, [points, getConflictGroups]);

  const filteredPoints = points.filter((point) => {
    if (filterStatus === 'all') return true;
    return point.status === filterStatus;
  });

  const sourceStats = points.reduce((acc, point) => {
    acc[point.source] = (acc[point.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getRelatedPublicListCount = (gisPointId: string) => {
    return publicListItems.filter((item) => item.gisPointId === gisPointId).length;
  };

  const getBorderClass = (point: typeof points[0]) => {
    if (highlightPointId === point.id) {
      return 'border-municipal-500 ring-2 ring-municipal-200';
    }
    if (point.status === 'conflict') {
      return 'border-danger-500';
    }
    if (point.status === 'incomplete') {
      return 'border-warning-500';
    }
    return 'border-gray-200';
  };

  const handleDetectConflicts = () => {
    detectConflicts();
  };

  const handleViewConflictDetail = (group: ConflictGroup) => {
    setSelectedConflictGroup(group);
    setConflictAlertOpen(true);
  };

  const handleMarkAsProcessed = (id: string) => {
    updatePointStatus(id, 'normal', '已手动处理');
  };

  const handleHighlight = (id: string | null) => {
    highlightPoint(id);
  };

  const statusFilters: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'normal', label: '正常' },
    { value: 'conflict', label: '冲突' },
    { value: 'incomplete', label: '数据不全' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-municipal-500 animate-spin" />
          <p className="text-gray-500">加载点位数据中...</p>
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
              <MapPin className="w-7 h-7 text-municipal-500" />
              GIS点位管理
            </h1>
            <p className="mt-1 text-gray-500">保留原始数据，自动检测街口冲突</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">状态筛选：</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    filterStatus === filter.value
                      ? 'bg-municipal-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {filter.label}
                  <span className="ml-1 text-xs opacity-75">
                    ({filter.value === 'all'
                      ? points.length
                      : points.filter((p) => p.status === filter.value).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleDetectConflicts}
            className="flex items-center gap-2 px-4 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-lg font-medium transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            冲突检测
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Database className="w-4 h-4" />
              数据来源：
            </span>
            {Object.entries(sourceStats).map(([source, count]) => (
              <span
                key={source}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {source}
                <span className="font-medium text-municipal-600">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex">
        <div className={cn('flex-1 p-6 transition-all duration-300', sidebarCollapsed ? 'mr-0' : 'mr-80')}>
          <AnimatePresence mode="wait">
            {filteredPoints.length > 0 ? (
              <motion.div
                key="grid"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredPoints.map((point) => (
                  <motion.div
                    key={point.id}
                    variants={cardVariants}
                    onMouseEnter={() => handleHighlight(point.id)}
                    onMouseLeave={() => handleHighlight(null)}
                    onClick={() => selectPoint(point.id === selectedPointId ? null : point.id)}
                    className={cn(
                      'bg-white rounded-xl border-2 p-5 cursor-pointer transition-all duration-300',
                      getBorderClass(point),
                      point.status === 'conflict' && 'animate-pulse-border',
                      highlightPointId === point.id && 'scale-[1.02] shadow-lg',
                      selectedPointId === point.id && 'bg-municipal-50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400">ID</span>
                          <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {point.id}
                          </code>
                        </div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-municipal-500" />
                          {point.street}
                        </h3>
                      </div>
                      <StatusBadge status={point.status} />
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-gray-400">坐标：</span>
                        <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">
                          {point.lng.toFixed(6)}, {point.lat.toFixed(6)}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-gray-400">来源：</span>
                        <span className="font-medium">{point.source}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-gray-400">关联清单：</span>
                        <span className="font-medium text-municipal-600">
                          {getRelatedPublicListCount(point.id)} 条
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPointId(expandedPointId === point.id ? null : point.id);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-municipal-600 hover:bg-gray-50 rounded-lg transition-colors mb-3"
                    >
                      {expandedPointId === point.id ? (
                        <>
                          <X className="w-4 h-4" />
                          收起原始数据
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          查看原始数据
                        </>
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedPointId === point.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden mb-3"
                        >
                          <RawDataPanel data={point.originalData} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {point.status !== 'normal' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsProcessed(point.id);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-success-500 hover:bg-success-600 text-white rounded-lg font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        标记为已处理
                      </button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-16 text-gray-500"
              >
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-lg">暂无符合条件的点位数据</p>
                <p className="text-sm mt-1">请尝试调整筛选条件</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className={cn(
            'fixed right-0 top-[136px] bottom-0 bg-white border-l border-gray-200 transition-all duration-300 z-10',
            sidebarCollapsed ? 'w-12' : 'w-80'
          )}
        >
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -left-4 top-4 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors z-20"
          >
            {sidebarCollapsed ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {!sidebarCollapsed && (
            <div className="h-full flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-danger-500" />
                  冲突组概览
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  共 {conflictGroups.length} 个冲突组，{conflictGroups.reduce((acc, g) => acc + g.points.length, 0)} 个冲突点位
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conflictGroups.length > 0 ? (
                  conflictGroups.map((group) => (
                    <motion.div
                      key={group.street}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-danger-50 rounded-xl border border-danger-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-danger-500" />
                            {group.street}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-bold text-danger-600">{group.points.length}</span> 个点位冲突
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {group.points.map((p) => (
                          <code
                            key={p.id}
                            className="text-xs bg-danger-100 text-danger-700 px-2 py-0.5 rounded font-mono"
                          >
                            {p.id}
                          </code>
                        ))}
                      </div>

                      <button
                        onClick={() => handleViewConflictDetail(group)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        查看详情
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <CheckCircle className="w-10 h-10 mb-2" />
                    <p className="text-sm">暂无冲突组</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConflictAlert
        isOpen={conflictAlertOpen}
        conflictGroup={selectedConflictGroup}
        onClose={() => setConflictAlertOpen(false)}
      />
    </div>
  );
}
