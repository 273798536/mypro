import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Database, TrendingUp, Info } from 'lucide-react';
import { Card } from '../ui/Card';

/**
 * 注册 Chart.js 必需的组件
 */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * 图表类型
 */
export type ChartType = 'bar' | 'line';

/**
 * 解释面板内容接口
 */
export interface ExplanationData {
  /** 指标名称 */
  title: string;
  /** 数据来源说明 */
  dataSource: string;
  /** 异常判定阈值文本描述 */
  threshold: string;
  /** 指标详细描述 */
  description: string;
  /** 当前值（可选） */
  currentValue?: string | number;
  /** 阈值（可选，用于对比展示） */
  thresholdValue?: string | number;
  /** 单位（可选） */
  unit?: string;
}

/**
 * 图表+明细解释面板组件属性接口
 */
interface ChartWithExplanationProps {
  /** 图表类型：柱状图或折线图 */
  chartType: ChartType;
  /** 图表数据 */
  chartData: ChartData<'bar'> | ChartData<'line'>;
  /** 图表配置选项 */
  chartOptions?: ChartOptions<'bar'> | ChartOptions<'line'>;
  /** 右侧解释面板数据 */
  explanation: ExplanationData;
}

/**
 * 默认图表配色方案
 */
const defaultChartColors = {
  primary: '#1e3a5f',
  secondary: '#2d5a4a',
  accent: '#d4a017',
  danger: '#c75b5b',
  background: 'rgba(30, 58, 95, 0.1)',
};

/**
 * 图表 + 明细解释面板组件
 * 左侧 Chart.js 柱状图/折线图，右侧固定宽度解释面板
 */
export function ChartWithExplanation({
  chartType,
  chartData,
  chartOptions,
  explanation,
}: ChartWithExplanationProps) {
  /**
   * 默认图表配置选项
   */
  const defaultOptions: ChartOptions<'bar' | 'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            font: {
              family: 'IBM Plex Sans, system-ui, sans-serif',
              size: 12,
            },
            color: '#1e3a5f',
          },
        },
        tooltip: {
          backgroundColor: '#1e3a5f',
          titleFont: {
            family: 'IBM Plex Sans, system-ui, sans-serif',
          },
          bodyFont: {
            family: 'IBM Plex Sans, system-ui, sans-serif',
          },
          padding: 12,
          cornerRadius: 6,
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(30, 58, 95, 0.06)',
          },
          ticks: {
            color: '#1e3a5f80',
            font: {
              family: 'IBM Plex Sans, system-ui, sans-serif',
              size: 11,
            },
          },
        },
        y: {
          grid: {
            color: 'rgba(30, 58, 95, 0.06)',
          },
          ticks: {
            color: '#1e3a5f80',
            font: {
              family: 'IBM Plex Sans, system-ui, sans-serif',
              size: 11,
            },
          },
          beginAtZero: true,
        },
      },
    }),
    []
  );

  /**
   * 合并用户配置和默认配置
   */
  const mergedOptions = useMemo(
    () => ({
      ...defaultOptions,
      ...chartOptions,
      plugins: {
        ...defaultOptions.plugins,
        ...chartOptions?.plugins,
      },
      scales: {
        ...defaultOptions.scales,
        ...chartOptions?.scales,
      },
    }),
    [defaultOptions, chartOptions]
  );

  /**
   * 判断当前值是否超过阈值
   */
  const isOverThreshold = useMemo(() => {
    if (
      explanation.currentValue === undefined ||
      explanation.thresholdValue === undefined
    ) {
      return null;
    }
    const current = Number(explanation.currentValue);
    const threshold = Number(explanation.thresholdValue);
    if (isNaN(current) || isNaN(threshold)) return null;
    return current > threshold;
  }, [explanation.currentValue, explanation.thresholdValue]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 左侧图表区域 */}
      <div className="lg:col-span-2">
        <Card className="p-5 h-full">
          <div className="h-72">
            {chartType === 'bar' ? (
              <Bar data={chartData as ChartData<'bar'>} options={mergedOptions} />
            ) : (
              <Line data={chartData as ChartData<'line'>} options={mergedOptions} />
            )}
          </div>
        </Card>
      </div>

      {/* 右侧解释面板（固定宽度） */}
      <div className="lg:col-span-1">
        <Card className="p-5 h-full">
          <div className="space-y-4">
            {/* 指标名称标题 */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-deep-ocean/10 rounded-lg flex-shrink-0">
                <TrendingUp size={20} className="text-deep-ocean" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-deep-ocean text-lg">
                  {explanation.title}
                </h3>
                {explanation.currentValue !== undefined && (
                  <p className="text-2xl font-serif font-bold text-deep-ocean mt-1">
                    {explanation.currentValue}
                    {explanation.unit && (
                      <span className="text-sm font-normal text-deep-ocean/60 ml-1">
                        {explanation.unit}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* 当前值与阈值对比 */}
            {explanation.thresholdValue !== undefined && (
              <div
                className={`p-3 rounded-lg border ${
                  isOverThreshold === null
                    ? 'bg-paper-dark/50 border-deep-ocean/10'
                    : isOverThreshold
                    ? 'bg-corral-severe/10 border-corral-severe/30'
                    : 'bg-life-green/10 border-life-green/30'
                }`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-deep-ocean/60">当前值</span>
                  <span
                    className={`font-semibold tabular ${
                      isOverThreshold ? 'text-corral-severe' : 'text-life-green'
                    }`}
                  >
                    {explanation.currentValue ?? '-'}
                    {explanation.unit && ` ${explanation.unit}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-deep-ocean/60">阈值</span>
                  <span className="font-semibold text-deep-ocean tabular">
                    {explanation.thresholdValue}
                    {explanation.unit && ` ${explanation.unit}`}
                  </span>
                </div>
                {isOverThreshold !== null && (
                  <div className="mt-2 pt-2 border-t border-deep-ocean/10">
                    <span
                      className={`text-xs font-medium ${
                        isOverThreshold ? 'text-corral-severe' : 'text-life-green'
                      }`}
                    >
                      {isOverThreshold ? '⚠ 已超过阈值，需关注' : '✓ 在正常范围内'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 数据来源说明 */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-deep-ocean/70">
                <Database size={14} />
                数据来源
              </div>
              <p className="text-sm text-deep-ocean/70 leading-relaxed pl-6">
                {explanation.dataSource}
              </p>
            </div>

            {/* 异常判定阈值 */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-deep-ocean/70">
                <Info size={14} />
                判定标准
              </div>
              <p className="text-sm text-deep-ocean/70 leading-relaxed pl-6">
                {explanation.threshold}
              </p>
            </div>

            {/* 指标详细描述 */}
            <div className="pt-3 border-t border-deep-ocean/10">
              <p className="text-xs text-deep-ocean/50 leading-relaxed">
                {explanation.description}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
