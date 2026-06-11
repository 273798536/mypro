import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChartData } from 'chart.js';
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  PackageAlert,
  Ruler,
  ListChecks,
  BookOpen,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { AnomalyList } from '../components/review/AnomalyList';
import { ChartWithExplanation } from '../components/review/ChartWithExplanation';
import { SpeciesSynonymCard } from '../components/review/SpeciesSynonymCard';
import { ReportExportPanel, type ReportType, type ReportFormat } from '../components/review/ReportExportPanel';
import { Card } from '../components/ui/Card';
import { useReviewStore } from '../store/useReviewStore';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { anomalyTypeLabel } from '../utils/anomaly';
import {
  exportReportAsText,
  exportAnomaliesToCSV,
  exportSynonymChecksToCSV,
  generateReportText,
} from '../utils/export';

/**
 * 统计卡片数据接口
 */
interface StatCardData {
  /** 卡片标题 */
  title: string;
  /** 统计数值 */
  value: number;
  /** 描述文字 */
  description: string;
  /** 图标组件 */
  icon: React.ReactNode;
  /** 图标背景色 */
  iconBg: string;
  /** 图标颜色 */
  iconColor: string;
  /** 装饰色（左侧边条） */
  accentColor: string;
}

/**
 * 复核与报告页
 * 顶部：异常统计概览 4 个指标卡
 * 中部：AnomalyList 异常表格
 * 下方：ChartWithExplanation + SpeciesSynonymCard 列表
 * 底部：ReportExportPanel
 */
export function ReviewPage() {
  const navigate = useNavigate();

  const anomalies = useReviewStore((s) => s.anomalies);
  const synonymChecks = useReviewStore((s) => s.synonymChecks);
  const resolveAnomaly = useReviewStore((s) => s.resolveAnomaly);
  const resolveSynonymCheck = useReviewStore((s) => s.resolveSynonymCheck);
  const runs = useWorkflowStore((s) => s.runs);
  const getRunById = useWorkflowStore((s) => s.getRunById);

  /** 预览模态框状态 */
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  /**
   * 计算统计概览数据
   */
  const stats = useMemo<StatCardData[]>(() => {
    const total = anomalies.length;
    const resolved = anomalies.filter((a) => a.resolved).length;
    const missingMaterial = anomalies.filter(
      (a) => a.type === 'missing_material' && !a.resolved
    ).length;
    const incorrectSpec = anomalies.filter(
      (a) => a.type === 'incorrect_spec' && !a.resolved
    ).length;

    return [
      {
        title: '异常总数',
        value: total,
        description: '所有运行累计检测到的异常',
        icon: <ListChecks size={24} />,
        iconBg: 'bg-deep-ocean/10',
        iconColor: 'text-deep-ocean',
        accentColor: 'bg-deep-ocean',
      },
      {
        title: '已解决',
        value: resolved,
        description: '已人工确认并标记解决',
        icon: <CheckCircle2 size={24} />,
        iconBg: 'bg-life-green/15',
        iconColor: 'text-life-green',
        accentColor: 'bg-life-green',
      },
      {
        title: '待补材料',
        value: missingMaterial,
        description: '缺少图片数据，需补充上传',
        icon: <PackageAlert size={24} />,
        iconBg: 'bg-amber-warn/15',
        iconColor: 'text-amber-warn',
        accentColor: 'bg-amber-warn',
      },
      {
        title: '待改口径',
        value: incorrectSpec,
        description: '物种或标注不规范，需人工校正',
        icon: <Ruler size={24} />,
        iconBg: 'bg-corral-severe/15',
        iconColor: 'text-corral-severe',
        accentColor: 'bg-corral-severe',
      },
    ];
  }, [anomalies]);

  /**
   * 异常趋势图数据
   */
  const trendChartData: ChartData<'line'> = useMemo(() => {
    const labels = runs
      .slice()
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .map((r) => r.version_label);

    const anomalyCounts = runs
      .slice()
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .map((r) => anomalies.filter((a) => a.run_id === r.id).length);

    return {
      labels,
      datasets: [
        {
          label: '异常数量',
          data: anomalyCounts,
          borderColor: '#c75b5b',
          backgroundColor: 'rgba(199, 91, 91, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [runs, anomalies]);

  /**
   * 异常类型分布图数据
   */
  const typeChartData: ChartData<'bar'> = useMemo(() => {
    const typeCounts: Record<string, number> = {
      missing_material: 0,
      incorrect_spec: 0,
      species_synonym: 0,
      annotation_low_conflict: 0,
      other: 0,
    };
    anomalies.forEach((a) => {
      typeCounts[a.type]++;
    });

    return {
      labels: Object.keys(typeCounts).map(
        (k) => anomalyTypeLabel[k as keyof typeof anomalyTypeLabel]
      ),
      datasets: [
        {
          label: '异常数量',
          data: Object.values(typeCounts),
          backgroundColor: [
            'rgba(212, 160, 23, 0.7)',
            'rgba(199, 91, 91, 0.7)',
            'rgba(45, 90, 74, 0.7)',
            'rgba(30, 58, 95, 0.7)',
            'rgba(30, 58, 95, 0.4)',
          ],
          borderRadius: 6,
        },
      ],
    };
  }, [anomalies]);

  /**
   * 处理异常解决
   */
  const handleResolveAnomaly = (id: string) => {
    resolveAnomaly(id, 'current_user');
  };

  /**
   * 处理查看样本
   */
  const handleViewSample = (sampleId: string) => {
    navigate(`/samples/${sampleId}`);
  };

  /**
   * 处理导出报告
   */
  const handleExport = (options: {
    reportType: ReportType;
    format: ReportFormat;
    runId1: string;
    runId2?: string;
    fileName: string;
  }) => {
    const { reportType, format, runId1, runId2, fileName } = options;

    if (reportType === 'all_anomalies') {
      if (format === 'csv') {
        exportAnomaliesToCSV(anomalies, fileName);
        exportSynonymChecksToCSV(synonymChecks, fileName.replace('anomalies', 'synonyms'));
      } else {
        const latestRun = runs[0];
        if (latestRun) {
          exportReportAsText(
            {
              run: latestRun,
              anomalies,
              synonymChecks,
            },
            fileName
          );
        }
      }
      return;
    }

    const run = getRunById(runId1);
    if (!run) return;

    const runAnomalies = anomalies.filter((a) => a.run_id === runId1);
    const runSynonyms = synonymChecks.filter((s) => s.run_id === runId1);

    if (format === 'csv') {
      exportAnomaliesToCSV(runAnomalies, fileName);
    } else {
      exportReportAsText(
        {
          run,
          anomalies: runAnomalies,
          synonymChecks: runSynonyms,
        },
        fileName
      );
    }
  };

  /**
   * 处理预览报告
   */
  const handlePreview = (options: {
    reportType: ReportType;
    runId1: string;
    runId2?: string;
  }) => {
    const { reportType, runId1 } = options;
    let content = '';

    if (reportType === 'all_anomalies') {
      const latestRun = runs[0];
      if (latestRun) {
        content = generateReportText({
          run: latestRun,
          anomalies,
          synonymChecks,
        });
      }
    } else {
      const run = getRunById(runId1);
      if (run) {
        const runAnomalies = anomalies.filter((a) => a.run_id === runId1);
        const runSynonyms = synonymChecks.filter((s) => s.run_id === runId1);
        content = generateReportText({
          run,
          anomalies: runAnomalies,
          synonymChecks: runSynonyms,
        });
      }
    }

    setPreviewContent(content);
    setShowPreview(true);
  };

  /**
   * 未解决的物种同义校验列表
   */
  const unresolvedSynonyms = useMemo(
    () => synonymChecks.filter((s) => !s.resolved),
    [synonymChecks]
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif font-bold text-deep-ocean text-2xl flex items-center gap-2">
              <FileCheck size={24} />
              复核与报告
            </h1>
            <p className="text-sm text-deep-ocean/50 mt-1">
              查看异常检测结果、物种同义校验、生成导出报告
            </p>
          </div>
        </div>

        {/* 顶部异常统计概览 - 4 个指标卡 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={stat.title} className="p-5 relative overflow-hidden">
              {/* 左侧装饰色条 */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${stat.accentColor}`}
              />
              <div className="pl-2">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-xl ${stat.iconBg} ${stat.iconColor}`}>
                    {stat.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-serif font-bold text-deep-ocean tabular">
                      {stat.value}
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold text-deep-ocean mb-0.5">{stat.title}</h4>
                <p className="text-xs text-deep-ocean/50 leading-relaxed">
                  {stat.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* 中部：异常列表表格 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-deep-ocean text-xl">
              <span className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-corral-severe" />
                异常列表
              </span>
            </h2>
          </div>
          <AnomalyList
            anomalies={anomalies}
            onResolve={handleResolveAnomaly}
            onViewSample={handleViewSample}
          />
        </div>

        {/* 下方：图表 + 解释面板 */}
        <div className="space-y-4">
          <h2 className="font-serif font-semibold text-deep-ocean text-xl">
            数据分析
          </h2>
          <ChartWithExplanation
            chartType="line"
            chartData={trendChartData}
            explanation={{
              title: '异常趋势',
              dataSource: '各次工作流运行的异常检测结果汇总',
              threshold: '单次运行异常数超过 5 条需人工介入复核',
              description:
                '跟踪各版本运行中检测到的异常数量变化趋势，观察异常是否随模型迭代逐步减少。上升趋势需排查数据质量或模型回归问题。',
              currentValue: anomalies.filter((a) => a.run_id === runs[runs.length - 1]?.id).length,
              thresholdValue: 5,
              unit: '条',
            }}
          />
          <ChartWithExplanation
            chartType="bar"
            chartData={typeChartData}
            explanation={{
              title: '异常类型分布',
              dataSource: '当前所有未解决和已解决异常的类型统计',
              threshold: '材料缺失类异常占比不应超过 20%',
              description:
                '按异常类型统计分布情况，帮助识别数据质量的主要问题点。材料缺失过多说明上游采集流程需优化，口径问题说明数据录入规范需加强。',
              currentValue: `${(
                (anomalies.filter((a) => a.type === 'missing_material').length /
                  Math.max(anomalies.length, 1)) *
                100
              ).toFixed(1)}%`,
              thresholdValue: '20%',
            }}
          />
        </div>

        {/* 物种同义校验卡片列表 */}
        {unresolvedSynonyms.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-semibold text-deep-ocean text-xl">
                <span className="flex items-center gap-2">
                  <BookOpen size={20} className="text-life-green" />
                  物种名同义待确认
                </span>
              </h2>
              <span className="text-sm text-deep-ocean/50">
                共 {unresolvedSynonyms.length} 条待确认
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unresolvedSynonyms.map((check) => (
                <SpeciesSynonymCard
                  key={check.id}
                  check={check}
                  onResolve={(id) => resolveSynonymCheck(id, 'current_user')}
                />
              ))}
            </div>
          </div>
        )}

        {/* 底部：报告导出面板 */}
        <div>
          <h2 className="font-serif font-semibold text-deep-ocean text-xl mb-4">
            报告导出
          </h2>
          <ReportExportPanel
            runs={runs}
            onExport={handleExport}
            onPreview={handlePreview}
          />
        </div>

        {/* 预览模态框 */}
        {showPreview && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreview(false)}
          >
            <div
              className="bg-white rounded-lg shadow-lift max-w-4xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-deep-ocean/10">
                <h3 className="font-serif font-semibold text-deep-ocean text-lg">
                  报告预览
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 rounded-lg hover:bg-paper-dark text-deep-ocean/50 hover:text-deep-ocean"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-paper">
                <pre className="text-xs text-deep-ocean/80 font-mono whitespace-pre-wrap leading-relaxed">
                  {previewContent}
                </pre>
              </div>
              <div className="flex justify-end p-4 border-t border-deep-ocean/10 gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-paper-dark text-deep-ocean rounded border border-deep-ocean/20 hover:bg-paper"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
