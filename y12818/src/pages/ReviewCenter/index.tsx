/**
 * 异常复核台页面（月底入口）
 * 功能：异常记录列表、多条件筛选、批量处理、详情抽屉
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  CheckCircle2,
  XCircle,
  Merge,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  Calendar,
  User,
  Layers,
  MapPin,
  FileText,
  Eye,
  ArrowRight,
  RefreshCw,
  Download,
} from 'lucide-react';
import { create } from 'zustand';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Drawer from '@/components/ui/Drawer';
import Card from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  mockAnomalyRecords,
  mockSampleRecords,
  mockMediaBatches,
  mockConclusionRecords,
  type AnomalyRecord,
  type SampleRecord,
} from '@/mock/sampleData';

/* =========================================================
 * 类型定义
 * ========================================================= */

/** Tab类型 */
type ReviewTab = 'pending' | 'approved' | 'rejected';

/** 复核台页面Store状态 */
interface ReviewCenterState {
  // Tab状态
  activeTab: ReviewTab;
  setActiveTab: (tab: ReviewTab) => void;

  // 筛选条件
  filters: {
    anomalyType: string;
    severity: string;
    batchId: string;
    dateFrom: string;
    dateTo: string;
    reportedBy: string;
    keyword: string;
  };
  setFilters: (filters: Partial<ReviewCenterState['filters']>) => void;
  clearFilters: () => void;

  // 选中的异常ID
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleSelectId: (id: string) => void;
  toggleSelectAll: (ids: string[]) => void;

  // 抽屉状态
  drawerOpen: boolean;
  viewingAnomalyId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
}

/** 复核台页面Store */
const useReviewCenterStore = create<ReviewCenterState>((set) => ({
  activeTab: 'pending',
  setActiveTab: (tab) => set({ activeTab: tab }),

  filters: {
    anomalyType: '',
    severity: '',
    batchId: '',
    dateFrom: '',
    dateTo: '',
    reportedBy: '',
    keyword: '',
  },
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  clearFilters: () =>
    set({
      filters: {
        anomalyType: '',
        severity: '',
        batchId: '',
        dateFrom: '',
        dateTo: '',
        reportedBy: '',
        keyword: '',
      },
    }),

  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelectId: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id],
    })),
  toggleSelectAll: (ids) =>
    set((state) => ({
      selectedIds: state.selectedIds.length === ids.length ? [] : ids,
    })),

  drawerOpen: false,
  viewingAnomalyId: null,
  openDrawer: (id) => set({ drawerOpen: true, viewingAnomalyId: id }),
  closeDrawer: () => set({ drawerOpen: false, viewingAnomalyId: null }),
}));

/* =========================================================
 * Tab配置
 * ========================================================= */

const TAB_CONFIG: Array<{
  key: ReviewTab;
  label: string;
  badgeVariant: 'pending' | 'approved' | 'rejected';
  statusFilter: AnomalyRecord['status'][];
}> = [
  {
    key: 'pending',
    label: '待复核',
    badgeVariant: 'pending',
    statusFilter: ['待处理', '处理中'],
  },
  {
    key: 'approved',
    label: '已复核',
    badgeVariant: 'approved',
    statusFilter: ['已解决'],
  },
  {
    key: 'rejected',
    label: '已驳回',
    badgeVariant: 'rejected',
    statusFilter: ['已关闭'],
  },
];

/* =========================================================
 * 异常类型标签映射
 * ========================================================= */

const ANOMALY_TYPE_MAP: Record<
  AnomalyRecord['anomalyType'],
  { label: string; color: string }
> = {
  数据异常: { label: '数据异常', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  设备异常: { label: '设备异常', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  环境异常: { label: '环境异常', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  试剂异常: { label: '试剂异常', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  操作异常: { label: '操作异常', color: 'bg-pink-50 text-pink-700 border-pink-200' },
};

/* =========================================================
 * 组件：顶部Tab栏
 * ========================================================= */

function TopTabs() {
  const { activeTab, setActiveTab } = useReviewCenterStore();

  // 计算各Tab数量
  const tabCounts = useMemo(() => {
    const counts: Record<ReviewTab, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const record of mockAnomalyRecords) {
      if (record.status === '待处理' || record.status === '处理中') {
        counts.pending++;
      } else if (record.status === '已解决') {
        counts.approved++;
      } else {
        counts.rejected++;
      }
    }
    return counts;
  }, []);

  return (
    <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
      <div className="flex space-x-1">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
              )}
            >
              {tabCounts[tab.key]}
            </span>
            {activeTab === tab.key && (
              <motion.div
                layoutId="review-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
 * 组件：多条件筛选栏
 * ========================================================= */

function FilterBar() {
  const { filters, setFilters, clearFilters } = useReviewCenterStore();
  const [expanded, setExpanded] = useState(true);

  // 批号列表
  const batchOptions = useMemo(
    () => mockMediaBatches.map((b) => ({ value: b.id, label: `${b.batchNo} - ${b.mediaName}` })),
    [],
  );

  // 异常类型列表
  const anomalyTypeOptions = [
    { value: '数据异常', label: '数据异常' },
    { value: '设备异常', label: '设备异常' },
    { value: '环境异常', label: '环境异常' },
    { value: '试剂异常', label: '试剂异常' },
    { value: '操作异常', label: '操作异常' },
  ];

  // 严重程度列表
  const severityOptions = [
    { value: '紧急', label: '紧急' },
    { value: '严重', label: '严重' },
    { value: '一般', label: '一般' },
  ];

  // 激活的筛选条件数量
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => v && v !== '').length;
  }, [filters]);

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <span className="font-medium text-slate-900 dark:text-white">筛选条件</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
              {activeFilterCount} 个已选
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            清除筛选
          </Button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            {expanded ? '收起' : '展开'}
            <ChevronDown
              size={16}
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {/* 关键字搜索 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  关键字搜索
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="标题、描述、处理措施..."
                    value={filters.keyword}
                    onChange={(e) => setFilters({ keyword: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                  {filters.keyword && (
                    <button
                      onClick={() => setFilters({ keyword: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 异常类型 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  异常类型
                </label>
                <select
                  value={filters.anomalyType}
                  onChange={(e) => setFilters({ anomalyType: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">全部类型</option>
                  {anomalyTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 严重程度 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  严重程度
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ severity: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">全部程度</option>
                  {severityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 关联批号 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Layers size={12} className="inline mr-1" />
                  关联批号
                </label>
                <select
                  value={filters.batchId}
                  onChange={(e) => setFilters({ batchId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">全部批号</option>
                  {batchOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 上报开始日期 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Calendar size={12} className="inline mr-1" />
                  上报日期（起）
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ dateFrom: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* 上报结束日期 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Calendar size={12} className="inline mr-1" />
                  上报日期（止）
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ dateTo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* 上报人 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  <User size={12} className="inline mr-1" />
                  上报人
                </label>
                <input
                  type="text"
                  placeholder="输入上报人姓名"
                  value={filters.reportedBy}
                  onChange={(e) => setFilters({ reportedBy: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* =========================================================
 * 组件：异常列表表格
 * ========================================================= */

function AnomalyTable() {
  const navigate = useNavigate();
  const {
    activeTab,
    filters,
    selectedIds,
    toggleSelectId,
    toggleSelectAll,
    openDrawer,
  } = useReviewCenterStore();

  // 当前Tab对应的status列表
  const statusList = useMemo(() => {
    return TAB_CONFIG.find((t) => t.key === activeTab)?.statusFilter ?? [];
  }, [activeTab]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return mockAnomalyRecords.filter((record) => {
      // Status筛选
      if (!statusList.includes(record.status)) return false;

      // 关键字搜索
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const text = [
          record.title,
          record.description,
          record.resolution ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!text.includes(kw)) return false;
      }

      // 异常类型
      if (filters.anomalyType && record.anomalyType !== filters.anomalyType) {
        return false;
      }

      // 严重程度
      if (filters.severity && record.severity !== filters.severity) {
        return false;
      }

      // 关联批号
      if (filters.batchId && record.batchId !== filters.batchId) {
        return false;
      }

      // 日期范围
      if (filters.dateFrom && record.reportedAt < filters.dateFrom) {
        return false;
      }
      if (
        filters.dateTo &&
        record.reportedAt > filters.dateTo + 'T23:59:59.999Z'
      ) {
        return false;
      }

      // 上报人
      if (
        filters.reportedBy &&
        !record.reportedBy.includes(filters.reportedBy)
      ) {
        return false;
      }

      return true;
    });
  }, [statusList, filters]);

  // 获取关联样本的采样地点
  const getSamplingLocation = (record: AnomalyRecord): string => {
    if (!record.sampleId) return '-';
    const sample = mockSampleRecords.find((s) => s.id === record.sampleId);
    return sample?.sampleName ?? '-';
  };

  // 获取关联结论标题
  const getConclusionTitle = (record: AnomalyRecord): string => {
    const batchConclusions = mockConclusionRecords.filter(
      (c) => c.batchId === record.batchId,
    );
    if (batchConclusions.length === 0) return '-';
    return batchConclusions[0].title;
  };

  // 判断是否为同义冲突行（根据异常类型或描述判断）
  const isSynonymConflict = (record: AnomalyRecord): boolean => {
    const sample = mockSampleRecords.find((s) => s.id === record.sampleId);
    return sample?.isSynonymCase ?? false;
  };

  const allSelected =
    filteredData.length > 0 &&
    selectedIds.length === filteredData.length;

  return (
    <Card className="mb-0 p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    toggleSelectAll(filteredData.map((r) => r.id))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                严重程度
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                异常标题
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                类型
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                采样地点
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                关联结论
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                上报人
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                上报时间
              </th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-16 text-center text-slate-500 dark:text-slate-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search size={40} className="text-slate-300 dark:text-slate-600" />
                    <p>暂无符合条件的异常记录</p>
                    <p className="text-xs">尝试调整筛选条件或清除筛选</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((record, index) => {
                const isConflict = isSynonymConflict(record);
                const isSelected = selectedIds.includes(record.id);

                return (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className={cn(
                      'border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-900/30',
                      isConflict &&
                        'bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30',
                      isSelected &&
                        'bg-blue-50/60 dark:bg-blue-950/20',
                    )}
                  >
                    {/* 复选框 */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectId(record.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                      />
                    </td>

                    {/* 严重程度 */}
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          record.severity === '紧急'
                            ? 'danger'
                            : record.severity === '严重'
                            ? 'warning'
                            : 'pending'
                        }
                      >
                        {record.severity}
                      </Badge>
                    </td>

                    {/* 异常标题 */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        {isConflict && (
                          <span
                            title="物种同义冲突"
                            className="mt-0.5 flex-shrink-0"
                          >
                            <AlertTriangle
                              size={16}
                              className="text-red-500"
                            />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                            {record.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {record.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 异常类型 */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium',
                          ANOMALY_TYPE_MAP[record.anomalyType].color,
                          'dark:bg-opacity-20',
                        )}
                      >
                        {ANOMALY_TYPE_MAP[record.anomalyType].label}
                      </span>
                    </td>

                    {/* 采样地点（可点击跳转） */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          navigate(
                            `/trace/${record.sampleId ?? record.batchId ?? ''}`,
                          );
                        }}
                        className="flex items-center gap-1 text-blue-600 underline decoration-blue-400/60 underline-offset-2 hover:text-blue-700 hover:decoration-blue-500 dark:text-blue-400 dark:decoration-blue-400/40 dark:hover:text-blue-300 transition-colors"
                      >
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="text-left line-clamp-1">
                          {getSamplingLocation(record)}
                        </span>
                      </button>
                    </td>

                    {/* 关联结论（可点击跳转） */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const batchConclusions = mockConclusionRecords.filter(
                            (c) => c.batchId === record.batchId,
                          );
                          if (batchConclusions.length > 0) {
                            navigate(
                              `/trace/${batchConclusions[0].id}`,
                            );
                          }
                        }}
                        className="flex items-start gap-1 text-left text-blue-600 underline decoration-blue-400/60 underline-offset-2 hover:text-blue-700 hover:decoration-blue-500 dark:text-blue-400 dark:decoration-blue-400/40 dark:hover:text-blue-300 transition-colors"
                      >
                        <FileText size={12} className="mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {getConclusionTitle(record)}
                        </span>
                      </button>
                    </td>

                    {/* 上报人 */}
                    <td className="px-4 py-3">
                      <span className="text-slate-700 dark:text-slate-300">
                        {record.reportedBy}
                      </span>
                    </td>

                    {/* 上报时间 */}
                    <td className="px-4 py-3">
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        {new Date(record.reportedAt).toLocaleDateString(
                          'zh-CN',
                          {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          },
                        )}
                      </span>
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye size={14} />}
                          onClick={() => openDrawer(record.id)}
                        >
                          查看
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ArrowRight size={14} />}
                          onClick={() =>
                            navigate(`/trace/${record.id}`)
                          }
                        >
                          追溯
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* =========================================================
 * 组件：底部操作栏
 * ========================================================= */

function BottomActionBar() {
  const { selectedIds, setSelectedIds, activeTab, setActiveTab } =
    useReviewCenterStore();

  const handleBatchApprove = () => {
    alert(`批量通过 ${selectedIds.length} 条异常记录`);
    setSelectedIds([]);
    if (activeTab === 'pending') {
      setActiveTab('approved');
    }
  };

  const handleBatchReject = () => {
    alert(`批量驳回 ${selectedIds.length} 条异常记录`);
    setSelectedIds([]);
    if (activeTab === 'pending') {
      setActiveTab('rejected');
    }
  };

  const handleMergeDuplicates = () => {
    alert(`合并 ${selectedIds.length} 条重复异常记录`);
    setSelectedIds([]);
  };

  if (selectedIds.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4 dark:border-slate-700">
          <AlertCircle size={18} className="text-blue-600" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            已选择 <span className="text-blue-600">{selectedIds.length}</span>{' '}
            条记录
          </span>
          <button
            onClick={() => setSelectedIds([])}
            className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle2 size={14} />}
            onClick={handleBatchApprove}
          >
            批量通过
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<XCircle size={14} />}
            onClick={handleBatchReject}
          >
            批量驳回
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Merge size={14} />}
            onClick={handleMergeDuplicates}
          >
            合并重复
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================
 * 组件：详情抽屉 - 原始记录显示
 * ========================================================= */

function DetailDrawer() {
  const navigate = useNavigate();
  const { drawerOpen, viewingAnomalyId, closeDrawer } =
    useReviewCenterStore();

  // 当前查看的异常记录
  const anomaly = useMemo(() => {
    if (!viewingAnomalyId) return null;
    return mockAnomalyRecords.find((r) => r.id === viewingAnomalyId) ?? null;
  }, [viewingAnomalyId]);

  // 关联样本
  const relatedSample = useMemo(() => {
    if (!anomaly?.sampleId) return null;
    return mockSampleRecords.find((s) => s.id === anomaly.sampleId) ?? null;
  }, [anomaly]);

  // 生成模拟的原始记录文本（带行号）
  const rawRecordLines = useMemo(() => {
    if (!anomaly) return [];
    const sample = relatedSample;
    return [
      `异常编号: ${anomaly.id}`,
      `异常标题: ${anomaly.title}`,
      `异常类型: ${anomaly.anomalyType}`,
      `严重程度: ${anomaly.severity}`,
      `处理状态: ${anomaly.status}`,
      `---`,
      `关联样本ID: ${anomaly.sampleId ?? '-'}`,
      `关联批号ID: ${anomaly.batchId ?? '-'}`,
      sample ? `样本编号: ${sample.sampleNo}` : '',
      sample ? `原始行号: ${sample.originalRowNo}` : '',
      sample ? `检测物种: ${sample.speciesName}` : '',
      sample ? `标准物种名: ${sample.standardSpeciesName}` : '',
      sample ? `检测结果: ${sample.result}` : '',
      sample ? `菌落数: ${sample.colonyCount ?? '-'} CFU/g` : '',
      `---`,
      `详细描述:`,
      anomaly.description,
      `---`,
      `上报人: ${anomaly.reportedBy}`,
      `上报时间: ${new Date(anomaly.reportedAt).toLocaleString('zh-CN')}`,
      anomaly.resolution ? `处理措施: ${anomaly.resolution}` : '',
      anomaly.resolvedBy ? `处理人: ${anomaly.resolvedBy}` : '',
      anomaly.resolvedAt
        ? `处理时间: ${new Date(anomaly.resolvedAt).toLocaleString('zh-CN')}`
        : '',
    ].filter(Boolean);
  }, [anomaly, relatedSample]);

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      title={anomaly?.title ?? '异常详情'}
      width="w-[560px]"
    >
      {anomaly && (
        <div className="space-y-6">
          {/* 状态概览 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-1">处理状态</p>
              <Badge
                variant={
                  anomaly.status === '已解决'
                    ? 'approved'
                    : anomaly.status === '已关闭'
                    ? 'rejected'
                    : 'pending'
                }
              >
                {anomaly.status}
              </Badge>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-1">严重程度</p>
              <Badge
                variant={
                  anomaly.severity === '紧急'
                    ? 'danger'
                    : anomaly.severity === '严重'
                    ? 'warning'
                    : 'pending'
                }
              >
                {anomaly.severity}
              </Badge>
            </div>
          </div>

          {/* 关联信息 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3 dark:text-white">
              关联信息
            </h4>
            <div className="space-y-2">
              <button
                onClick={() =>
                  navigate(`/trace/${anomaly.sampleId ?? anomaly.batchId ?? ''}`)
                }
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">关联样本/批号</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {relatedSample?.sampleName ??
                      mockMediaBatches.find((b) => b.id === anomaly.batchId)
                        ?.batchNo ??
                      '-'}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-slate-400"
                />
              </button>
            </div>
          </div>

          {/* 原始记录 - 等宽字体 + 行号色块 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                原始记录
              </h4>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={12} />}>
                  刷新
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<Download size={12} />}>
                  导出
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900 dark:border-slate-700">
              <div className="max-h-[400px] overflow-auto">
                {rawRecordLines.map((line, index) => (
                  <div
                    key={index}
                    className="flex text-xs font-mono hover:bg-slate-800/50"
                  >
                    {/* 行号色块 */}
                    <div className="flex-shrink-0 select-none bg-slate-800/80 px-3 py-1.5 text-right text-slate-500 border-r border-slate-700 w-12">
                      {index + 1}
                    </div>
                    {/* 内容行 */}
                    <div className="flex-1 px-3 py-1.5 text-slate-300 whitespace-pre-wrap break-all">
                      {line || '\u00A0'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 附件列表 */}
          {anomaly.attachments && anomaly.attachments.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3 dark:text-white">
                相关附件 ({anomaly.attachments.length})
              </h4>
              <div className="space-y-2">
                {anomaly.attachments.map((attachment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                      <FileText
                        size={18}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate dark:text-white">
                        {attachment}
                      </p>
                      <p className="text-xs text-slate-500">PDF / 图片文档</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      查看
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

/* =========================================================
 * 主组件：异常复核台页面
 * ========================================================= */

export default function ReviewCenter() {
  const params = useParams();
  const location = useLocation();

  // 初始化：如果URL带了id参数，自动打开抽屉
  useEffect(() => {
    const { openDrawer, setActiveTab } = useReviewCenterStore.getState();
    if (params.id) {
      openDrawer(params.id);
    }
    // 根据路由设置tab
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab') as ReviewTab;
    if (tab && ['pending', 'approved', 'rejected'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [params.id, location.search]);

  return (
    <AppLayout>
      <div className="space-y-6 pb-24">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              异常复核台
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              月底复核入口 - 审核处理各类数据异常，确保数据质量和合规性
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" leftIcon={<Download size={16} />}>
              导出复核清单
            </Button>
          </div>
        </div>

        {/* 顶部Tab切换 */}
        <TopTabs />

        {/* 多条件筛选栏 */}
        <FilterBar />

        {/* 异常列表表格 */}
        <AnomalyTable />

        {/* 底部操作栏 */}
        <AnimatePresence>
          <BottomActionBar />
        </AnimatePresence>

        {/* 详情抽屉 */}
        <DetailDrawer />
      </div>
    </AppLayout>
  );
}
