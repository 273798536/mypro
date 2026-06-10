/**
 * 工作台仪表盘页面
 * 包含数据概览卡片、快捷入口、异常预警列表、月度复核进度
 */

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  ClipboardList,
  Replace,
  FileText,
  Download,
  Search,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Plus,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import MiniTrend, { TrendDataPoint } from '@/components/charts/MiniTrend';
import { useSampleStore } from '@/store/sampleStore';
import { useAnomalyStore } from '@/store/anomalyStore';
import { cn } from '@/lib/utils';
import type { MediaBatch, SampleRecord, AnomalyRecord } from '@/mock/sampleData';

// ==================== 类型定义 ====================

/** 数据概览卡片配置 */
interface StatCardConfig {
  /** 唯一标识 */
  key: string;
  /** 卡片标题 */
  title: string;
  /** 数值 */
  value: number;
  /** 图标组件 */
  icon: typeof Package;
  /** 趋势图颜色 */
  trendColor: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'slate';
  /** 图标背景颜色类名 */
  iconBgClass: string;
  /** 图标颜色类名 */
  iconClass: string;
  /** 趋势数据 */
  trendData: TrendDataPoint[];
}

/** 快捷入口配置 */
interface QuickEntryConfig {
  /** 唯一标识 */
  key: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 图标组件 */
  icon: typeof FileText;
  /** 路由路径 */
  path: string;
  /** 是否高亮为大卡片 */
  highlighted: boolean;
}

/** 异常预警列表项 */
interface AnomalyListItem {
  /** 异常ID */
  id: string;
  /** 批号 */
  batchNo: string;
  /** 物种名称 */
  speciesName: string;
  /** 异常类型 */
  anomalyType: string;
  /** 上报时间 */
  reportedAt: string;
  /** 严重程度 */
  severity: AnomalyRecord['severity'];
}

// ==================== 配置常量 ====================

/** 快捷入口配置列表 */
const QUICK_ENTRIES: QuickEntryConfig[] = [
  {
    key: 'report-export',
    title: '报告导出',
    description: '生成完整的追溯审计报告，支持PDF和Excel格式',
    icon: Download,
    path: '/report',
    highlighted: true,
  },
  {
    key: 'data-import',
    title: '数据导入',
    description: '批量导入Excel/CSV检测数据',
    icon: Upload,
    path: '/workflow',
    highlighted: false,
  },
  {
    key: 'anomaly-review',
    title: '异常复核',
    description: '处理待审核的异常记录',
    icon: ClipboardList,
    path: '/review',
    highlighted: false,
  },
  {
    key: 'traceability',
    title: '数据追溯',
    description: '查询样本完整追溯链路',
    icon: Search,
    path: '/traceability',
    highlighted: false,
  },
  {
    key: 'create-batch',
    title: '新建批号',
    description: '录入新的培养基批号信息',
    icon: Plus,
    path: '/workflow',
    highlighted: false,
  },
];

// ==================== 工具函数 ====================

/**
 * 生成模拟趋势数据
 * @param baseValue 基准值
 * @param days 天数
 * @param variance 波动幅度
 */
function generateTrendData(
  baseValue: number,
  days: number,
  variance: number
): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const randomVariance = Math.floor(Math.random() * variance * 2) - variance;
    data.push({
      name: `${date.getMonth() + 1}/${date.getDate()}`,
      value: Math.max(0, baseValue + randomVariance),
    });
  }
  return data;
}

/**
 * 格式化相对时间（刚刚、X分钟前等）
 * @param isoDate ISO日期字符串
 */
function formatRelativeTime(isoDate: string): string {
  const now = new Date().getTime();
  const target = new Date(isoDate).getTime();
  const diffMs = now - target;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return new Date(isoDate).toLocaleDateString('zh-CN');
}

/**
 * 获取批号ID对应的批号编号
 * @param batchId 批号ID
 * @param batches 批号列表
 */
function getBatchNoById(
  batchId: string,
  batches: MediaBatch[]
): string {
  return batches.find((b) => b.id === batchId)?.batchNo ?? '未知批号';
}

/**
 * 获取样本ID对应的物种名称
 * @param sampleId 样本ID
 * @param samples 样本列表
 */
function getSpeciesNameBySampleId(
  sampleId: string,
  samples: SampleRecord[]
): string {
  return samples.find((s) => s.id === sampleId)?.speciesName ?? '未知物种';
}

// ==================== 子组件 ====================

/**
 * 数据概览卡片组件
 */
function StatCard({
  config,
  index,
}: {
  config: StatCardConfig;
  index: number;
}) {
  const Icon = config.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card hoverable className="h-full">
        <div className="flex flex-col gap-4">
          {/* 顶部：图标和标题 */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {config.title}
              </span>
              <span className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {config.value.toLocaleString()}
              </span>
            </div>
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                config.iconBgClass
              )}
            >
              <Icon className={cn('h-6 w-6', config.iconClass)} />
            </div>
          </div>
          {/* 底部：迷你趋势图 */}
          <div className="-mx-2 -mb-2 h-20">
            <MiniTrend
              data={config.trendData}
              type="area"
              color={config.trendColor}
              height={80}
              showTooltip={true}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * 快捷入口大卡片（高亮）
 */
function HighlightedEntry({
  entry,
  onClick,
}: {
  entry: QuickEntryConfig;
  onClick: () => void;
}) {
  const Icon = entry.icon;
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="group relative col-span-2 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-left text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
    >
      {/* 背景装饰 */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-all duration-300 group-hover:bg-white/30 group-hover:translate-x-1">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">{entry.title}</h3>
          <p className="text-sm text-white/80 max-w-xs">
            {entry.description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * 快捷入口小卡片
 */
function SmallEntry({
  entry,
  index,
  onClick,
}: {
  entry: QuickEntryConfig;
  index: number;
  onClick: () => void;
}) {
  const Icon = entry.icon;
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 + index * 0.08 }}
      className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all duration-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-slate-900 dark:text-white">
          {entry.title}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {entry.description}
        </span>
      </div>
    </motion.button>
  );
}

/**
 * 月度复核进度组件
 */
function MonthlyReviewProgress({
  planned,
  completed,
  inProgress,
}: {
  planned: number;
  completed: number;
  inProgress: number;
}) {
  const completionRate = planned > 0 ? Math.round((completed / planned) * 100) : 0;
  const inProgressRate = planned > 0 ? Math.round((inProgress / planned) * 100) : 0;
  const currentMonth = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.9 }}
    >
      <Card>
        <div className="flex flex-col gap-5">
          {/* 标题区域 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                月度复核进度
              </h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {currentMonth}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {completionRate}%
              </span>
              {completionRate >= 80 && (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              )}
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="flex h-full">
                {/* 已完成 */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 1, delay: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                />
                {/* 进行中 */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${inProgressRate}%` }}
                  transition={{ duration: 1, delay: 1.2, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                />
              </div>
            </div>

            {/* 图例 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    已完成 {completed}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    进行中 {inProgress}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <span className="text-slate-600 dark:text-slate-400">
                    待处理 {Math.max(0, planned - completed - inProgress)}
                  </span>
                </div>
              </div>
              <span className="text-slate-500 dark:text-slate-400">
                计划 {planned}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== 主页面组件 ====================

/**
 * 工作台仪表盘页面组件
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const sampleStore = useSampleStore();
  const anomalyStore = useAnomalyStore();

  // 初始化数据
  useEffect(() => {
    void sampleStore.initData();
    anomalyStore.loadRecords();
  }, [sampleStore, anomalyStore]);

  // 从 store 获取统计数据
  const stats = useMemo(() => {
    const sampleStats = sampleStore.getStatistics();
    const anomalyStats = anomalyStore.getStatistics();

    // 计算本月报告数（模拟：基于样本数的30%）
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlySamples = sampleStore.sampleRecords.filter(
      (s) => s.createdAt >= monthStart
    ).length;
    const monthlyReports = Math.max(1, Math.floor(monthlySamples * 0.3));

    return {
      totalBatchCount: sampleStats.totalBatches,
      pendingReviewCount: anomalyStats.pendingCount,
      synonymConflictCount: sampleStats.synonymCaseCount,
      monthlyReportCount: monthlyReports,
    };
  }, [sampleStore, anomalyStore]);

  // 生成数据概览卡片配置
  const statCards: StatCardConfig[] = useMemo(
    () => [
      {
        key: 'total-batches',
        title: '总批次数',
        value: stats.totalBatchCount,
        icon: Package,
        trendColor: 'blue',
        iconBgClass: 'bg-blue-50 dark:bg-blue-950/50',
        iconClass: 'text-blue-600 dark:text-blue-400',
        trendData: generateTrendData(stats.totalBatchCount, 7, 2),
      },
      {
        key: 'pending-review',
        title: '待复核数',
        value: stats.pendingReviewCount,
        icon: ClipboardList,
        trendColor: 'amber',
        iconBgClass: 'bg-amber-50 dark:bg-amber-950/50',
        iconClass: 'text-amber-600 dark:text-amber-400',
        trendData: generateTrendData(stats.pendingReviewCount, 7, 3),
      },
      {
        key: 'synonym-conflicts',
        title: '同义冲突数',
        value: stats.synonymConflictCount,
        icon: Replace,
        trendColor: 'red',
        iconBgClass: 'bg-red-50 dark:bg-red-950/50',
        iconClass: 'text-red-600 dark:text-red-400',
        trendData: generateTrendData(stats.synonymConflictCount, 7, 2),
      },
      {
        key: 'monthly-reports',
        title: '本月报告数',
        value: stats.monthlyReportCount,
        icon: FileText,
        trendColor: 'purple',
        iconBgClass: 'bg-purple-50 dark:bg-purple-950/50',
        iconClass: 'text-purple-600 dark:text-purple-400',
        trendData: generateTrendData(stats.monthlyReportCount, 7, 1),
      },
    ],
    [stats]
  );

  // 获取异常预警列表数据
  const anomalyListItems: AnomalyListItem[] = useMemo(() => {
    const pendingRecords = anomalyStore.anomalyRecords
      .filter((r) => r.status === '待处理' || r.status === '处理中')
      .slice(0, 5);

    return pendingRecords.map((record) => ({
      id: record.id,
      batchNo: getBatchNoById(record.batchId, sampleStore.mediaBatches),
      speciesName: record.sampleId
        ? getSpeciesNameBySampleId(record.sampleId, sampleStore.sampleRecords)
        : '关联多个样本',
      anomalyType: record.anomalyType,
      reportedAt: record.reportedAt,
      severity: record.severity,
    }));
  }, [anomalyStore, sampleStore.mediaBatches, sampleStore.sampleRecords]);

  // 计算月度复核进度
  const monthlyProgress = useMemo(() => {
    const anomalyStats = anomalyStore.getStatistics();
    const sampleStats = sampleStore.getStatistics();
    const planned = anomalyStats.totalRecords + sampleStats.statusCounts['待审核'];
    const completed =
      anomalyStats.statusCounts['已解决'] +
      anomalyStats.statusCounts['已关闭'] +
      sampleStats.statusCounts['已审核'] +
      sampleStats.statusCounts['已确认'];
    const inProgress =
      anomalyStats.statusCounts['处理中'] + sampleStats.statusCounts['需修正'];
    return {
      planned: Math.max(planned, 1),
      completed,
      inProgress,
    };
  }, [anomalyStore, sampleStore]);

  // 快捷入口点击处理
  const handleQuickEntryClick = (path: string) => {
    navigate(path);
  };

  // 处理异常按钮点击
  const handleHandleAnomaly = (anomalyId: string) => {
    anomalyStore.setViewingAnomaly(anomalyId);
    navigate('/review');
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            工作台仪表盘
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            欢迎回来，以下是您的数据概览和待办事项
          </p>
        </motion.div>

        {/* 数据概览卡片区域 */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card, index) => (
              <StatCard key={card.key} config={card} index={index} />
            ))}
          </div>
        </section>

        {/* 快捷入口区域 */}
        <section>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-4 text-lg font-semibold text-slate-900 dark:text-white"
          >
            快捷入口
          </motion.h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ENTRIES.map((entry) =>
              entry.highlighted ? (
                <HighlightedEntry
                  key={entry.key}
                  entry={entry}
                  onClick={() => handleQuickEntryClick(entry.path)}
                />
              ) : (
                <SmallEntry
                  key={entry.key}
                  entry={entry}
                  index={QUICK_ENTRIES.filter((e) => !e.highlighted).indexOf(
                    entry
                  )}
                  onClick={() => handleQuickEntryClick(entry.path)}
                />
              )
            )}
          </div>
        </section>

        {/* 异常预警列表 + 月度复核进度 */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 异常预警列表 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="lg:col-span-2"
          >
            <Card>
              <div className="flex flex-col gap-4">
                {/* 标题栏 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      异常预警
                    </h3>
                    {stats.pendingReviewCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
                        {stats.pendingReviewCount} 待处理
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/review')}
                    className="text-xs"
                  >
                    查看全部
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>

                {/* 异常列表 */}
                {anomalyListItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <CheckCircle2 className="mb-3 h-12 w-12 text-green-400" />
                    <p className="text-sm">暂无待处理异常，继续保持！</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                            批号
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                            物种
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                            类型
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                            时间
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-300">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {anomalyListItems.map((item) => (
                          <tr
                            key={item.id}
                            className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {item.batchNo}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {item.speciesName}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  item.severity === '紧急'
                                    ? 'danger'
                                    : item.severity === '严重'
                                    ? 'warning'
                                    : 'pending'
                                }
                                showIcon={false}
                              >
                                {item.anomalyType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {formatRelativeTime(item.reportedAt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleHandleAnomaly(item.id)}
                              >
                                处理
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* 月度复核进度 */}
          <MonthlyReviewProgress
            planned={monthlyProgress.planned}
            completed={monthlyProgress.completed}
            inProgress={monthlyProgress.inProgress}
          />
        </section>
      </div>
    </AppLayout>
  );
}
