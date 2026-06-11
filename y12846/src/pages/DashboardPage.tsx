import { useMemo, useState } from 'react';
import {
  Dna,
  Target,
  AlertTriangle,
  Users,
  ChevronRight,
  Eye,
  AlertCircle,
  Thermometer,
  MapPin,
  Package,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FlaskConical,
  Activity,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Table, type Column } from '../components/ui/Table';
import { Progress } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/EmptyState';
import CoverageTrack from '../components/coverage/CoverageTrack';
import DepthPlot from '../components/coverage/DepthPlot';
import PrimerDetail from '../components/coverage/PrimerDetail';
import { cn } from '../lib/utils';
import type { PrimerPair, SampleResult, Mutation } from '../lib/utils/types';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Dna;
  color: 'brand' | 'success' | 'warning' | 'danger';
  trend?: { value: string; positive: boolean };
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-600 border-brand-200',
    success: 'bg-success-50 text-success-600 border-success-200',
    warning: 'bg-warning-50 text-warning-600 border-warning-200',
    danger: 'bg-danger-50 text-danger-600 border-danger-200',
  }[color];

  const iconBg = {
    brand: 'bg-brand-100 text-brand-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    danger: 'bg-danger-100 text-danger-600',
  }[color];

  return (
    <Card className={cn('overflow-hidden', colorClasses)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
            <p className="mt-1.5 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconBg)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { analysisResult } = useAnalysisStore();
  const navigate = useNavigate();
  const [expandedPrimerId, setExpandedPrimerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('primers');

  const result = analysisResult;

  const primerColumns: Column<PrimerPair>[] = useMemo(
    () => [
      {
        key: 'name',
        title: '引物名称',
        dataIndex: 'name',
        sortable: true,
        render: (value: string, record) => (
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-brand-500" />
            <span className="font-mono text-sm font-medium">{value}</span>
          </div>
        ),
      },
      {
        key: 'batch',
        title: '批次',
        dataIndex: 'batch',
        sortable: true,
        render: (value?: string) => (
          <span className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
            <Package className="h-3 w-3" />
            {value || '-'}
          </span>
        ),
      },
      {
        key: 'region',
        title: '覆盖区间',
        render: (_: any, record: PrimerPair) => (
          <div className="flex items-center gap-1 font-mono text-xs">
            <MapPin className="h-3 w-3 text-neutral-400" />
            <span>{record.ampliconStart}</span>
            <ArrowRight className="h-3 w-3 text-neutral-300" />
            <span>{record.ampliconEnd}</span>
            <span className="ml-1 text-neutral-400">({record.productSize}bp)</span>
          </div>
        ),
      },
      {
        key: 'tm',
        title: 'Tm 值',
        render: (_: any, record: PrimerPair) => (
          <div className="flex items-baseline gap-1 font-mono text-xs">
            <Thermometer className="h-3 w-3 text-neutral-400" />
            <span className="text-blue-600">{record.forward.tm.toFixed(1)}°C</span>
            <span className="text-neutral-300">/</span>
            <span className="text-purple-600">{record.reverse.tm.toFixed(1)}°C</span>
          </div>
        ),
      },
      {
        key: 'status',
        title: '状态',
        dataIndex: 'status',
        sortable: true,
        filterable: true,
        filterOptions: [
          { label: '有效', value: 'valid' },
          { label: '警告', value: 'warning' },
          { label: '无效', value: 'invalid' },
          { label: '需审核', value: 'needs_review' },
        ],
        render: (value: PrimerPair['status']) => {
          const config = {
            valid: { variant: 'success' as const, label: '有效', icon: CheckCircle2 },
            warning: { variant: 'warning' as const, label: '警告', icon: AlertTriangle },
            invalid: { variant: 'danger' as const, label: '无效', icon: XCircle },
            needs_review: { variant: 'info' as const, label: '需审核', icon: AlertCircle },
          }[value];
          const StatusIcon = config.icon;
          return (
            <Badge variant={config.variant}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          );
        },
      },
      {
        key: 'actions',
        title: '操作',
        align: 'right',
        render: (_: any, record: PrimerPair) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedPrimerId(expandedPrimerId === record.id ? null : record.id);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              详情
            </Button>
            {(record.status === 'warning' || record.status === 'invalid' || record.status === 'needs_review') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/anomalies');
                }}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-warning-600" />
                异常
              </Button>
            )}
          </div>
        ),
      },
    ],
    [expandedPrimerId, navigate]
  );

  const sampleColumns: Column<SampleResult>[] = useMemo(
    () => [
      {
        key: 'sampleName',
        title: '样本名称',
        dataIndex: 'sampleName',
        sortable: true,
        render: (value: string) => (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            <span className="font-mono text-sm font-medium">{value}</span>
          </div>
        ),
      },
      {
        key: 'mutationCount',
        title: '突变数',
        dataIndex: 'mutationCount',
        sortable: true,
        align: 'center',
        render: (value: number) => (
          <span className={cn(
            'font-mono text-sm font-semibold',
            value > 3 ? 'text-danger-600' : value > 0 ? 'text-warning-600' : 'text-success-600'
          )}>
            {value}
          </span>
        ),
      },
      {
        key: 'criticalMismatches',
        title: '关键错配',
        render: (_: any, record: SampleResult) => (
          <div className="flex items-center gap-1">
            {record.criticalMismatches.length > 0 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-danger-500" />
                <span className="font-mono text-sm font-semibold text-danger-600">
                  {record.criticalMismatches.length} 个
                </span>
              </>
            ) : (
              <span className="text-sm text-neutral-400">无</span>
            )}
          </div>
        ),
      },
      {
        key: 'recommendation',
        title: '建议',
        render: (_: any, record: SampleResult) => (
          <div className="max-w-xs">
            {record.needsAlternativePrimers ? (
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-warning-500 flex-shrink-0" />
                <span className="text-sm text-warning-700 dark:text-warning-300">
                  建议更换引物或设计替代方案
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-success-500 flex-shrink-0" />
                <span className="text-sm text-success-700 dark:text-success-300">
                  当前引物可用，扩增效率良好
                </span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        title: '状态',
        render: (_: any, record: SampleResult) =>
          record.needsAlternativePrimers ? (
            <Badge variant="warning">需关注</Badge>
          ) : (
            <Badge variant="success">正常</Badge>
          ),
      },
    ],
    []
  );

  const mutationColumns: Column<Mutation>[] = useMemo(
    () => [
      {
        key: 'sampleName',
        title: '样本',
        dataIndex: 'sampleName',
        sortable: true,
        render: (value: string) => (
          <span className="font-mono text-sm">{value}</span>
        ),
      },
      {
        key: 'position',
        title: '位置',
        dataIndex: 'position',
        sortable: true,
        render: (value: number) => (
          <span className="font-mono text-sm">{value.toLocaleString()} bp</span>
        ),
      },
      {
        key: 'change',
        title: '碱基变化',
        render: (_: any, record: Mutation) => (
          <div className="flex items-center gap-1.5 font-mono text-sm">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-100 text-blue-700 font-bold text-xs">
              {record.refBase}
            </span>
            <ArrowRight className="h-3 w-3 text-neutral-400" />
            <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-danger-100 text-danger-700 font-bold text-xs">
              {record.altBase}
            </span>
          </div>
        ),
      },
      {
        key: 'alleleFrequency',
        title: '等位基因频率',
        dataIndex: 'alleleFrequency',
        sortable: true,
        render: (value?: number) => (
          value !== undefined ? (
            <div className="w-32">
              <Progress
                value={value * 100}
                size="sm"
                variant={value > 0.8 ? 'danger' : value > 0.5 ? 'warning' : 'success'}
                showLabel
                label={`${(value * 100).toFixed(1)}%`}
              />
            </div>
          ) : (
            <span className="text-neutral-400 text-sm">-</span>
          )
        ),
      },
      {
        key: 'quality',
        title: '测序质量',
        dataIndex: 'quality',
        sortable: true,
        render: (value?: number) => (
          value !== undefined ? (
            <span className={cn(
              'font-mono text-sm',
              value > 300 ? 'text-success-600' : value > 200 ? 'text-warning-600' : 'text-danger-600'
            )}>
              {value.toFixed(1)}
            </span>
          ) : (
            <span className="text-neutral-400 text-sm">-</span>
          )
        ),
      },
      {
        key: 'impact',
        title: '影响评估',
        render: (_: any, record: Mutation) => {
          if (!result) return <span className="text-neutral-400 text-sm">-</span>;
          const impacts = result.mutationImpacts.filter((i) => i.mutationId === record.id);
          if (impacts.length === 0) {
            return <Badge variant="success">无影响</Badge>;
          }
          const hasCritical = impacts.some((i) => i.mismatchLevel === 'critical');
          const hasHigh = impacts.some((i) => i.mismatchLevel === 'high');
          if (hasCritical) return <Badge variant="danger">关键影响</Badge>;
          if (hasHigh) return <Badge variant="warning">较高影响</Badge>;
          return <Badge variant="info">低影响</Badge>;
        },
      },
    ],
    [result]
  );

  if (!result) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <EmptyState
          size="lg"
          icon={<Activity className="h-16 w-16" />}
          title="暂无分析结果"
          description="请先导入数据并运行分析，分析完成后将在此展示详细的覆盖图谱和统计信息"
          action={
            <Button onClick={() => navigate('/import')}>
              <Dna className="h-4 w-4" />
              前往数据导入
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">分析看板</h1>
          <p className="mt-1 text-sm text-neutral-500">
            参考序列: <span className="font-mono">{result.reference.name}</span> ·
            生成时间: {new Date(result.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/import')}>
            <Dna className="h-4 w-4" />
            重新导入
          </Button>
          <Button onClick={() => navigate('/report')}>
            <Target className="h-4 w-4" />
            查看报告
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="引物总数"
          value={result.summary.totalPrimers}
          subtitle={`有效 ${result.summary.validPrimers} 对`}
          icon={FlaskConical}
          color="brand"
        />
        <StatCard
          title="覆盖率"
          value={`${(result.summary.coveragePercent * 100).toFixed(1)}%`}
          subtitle={`${result.summary.gapCount} 个缺口区域`}
          icon={Target}
          color={result.summary.coveragePercent >= 0.95 ? 'success' : result.summary.coveragePercent >= 0.8 ? 'warning' : 'danger'}
        />
        <StatCard
          title="异常数"
          value={result.summary.anomalyCount}
          subtitle={result.anomalies.filter((a) => a.severity === 'error').length + ' 个严重'}
          icon={AlertTriangle}
          color={result.summary.anomalyCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="需关注样本"
          value={result.summary.samplesNeedingAttention}
          subtitle={`共 ${result.sampleResults.length} 个样本`}
          icon={Users}
          color={result.summary.samplesNeedingAttention > 0 ? 'danger' : 'success'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-500" />
            全基因组覆盖图谱
          </CardTitle>
          <CardDescription>可视化展示引物覆盖区域、深度和突变位点分布</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <CoverageTrack
            referenceLength={result.reference.length}
            primerPairs={result.primerPairs}
            coverage={result.coverage}
            mutations={result.mutations}
            onPrimerClick={(primer) => {
              setExpandedPrimerId(expandedPrimerId === primer.id ? null : primer.id);
              setActiveTab('primers');
            }}
          />
          <DepthPlot
            referenceLength={result.reference.length}
            coverage={result.coverage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList>
              <TabsTrigger value="primers">
                <FlaskConical className="h-4 w-4 mr-1.5" />
                引物明细
                <Badge variant="default" className="ml-2">{result.primerPairs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="samples">
                <Users className="h-4 w-4 mr-1.5" />
                样本建议
                <Badge variant="default" className="ml-2">{result.sampleResults.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="mutations">
                <Activity className="h-4 w-4 mr-1.5" />
                突变位点
                <Badge variant="default" className="ml-2">{result.mutations.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="primers">
              <Table<PrimerPair>
                columns={primerColumns}
                data={result.primerPairs}
                rowKey="id"
                expandable
                expandedRowRender={(record) => (
                  <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                    <PrimerDetail
                      primerPair={record}
                      reference={result.reference}
                      mutations={result.mutations}
                    />
                  </div>
                )}
                onRowClick={(record) => {
                  setExpandedPrimerId(expandedPrimerId === record.id ? null : record.id);
                }}
                defaultSortKey="name"
                defaultSortOrder="asc"
              />
            </TabsContent>

            <TabsContent value="samples">
              {result.sampleResults.length > 0 ? (
                <Table<SampleResult>
                  columns={sampleColumns}
                  data={result.sampleResults}
                  rowKey="sampleId"
                  defaultSortKey="sampleName"
                  defaultSortOrder="asc"
                />
              ) : (
                <EmptyState
                  size="sm"
                  title="暂无样本数据"
                  description="导入突变数据后将自动生成样本分析建议"
                />
              )}
            </TabsContent>

            <TabsContent value="mutations">
              {result.mutations.length > 0 ? (
                <Table<Mutation>
                  columns={mutationColumns}
                  data={result.mutations}
                  rowKey="id"
                  defaultSortKey="position"
                  defaultSortOrder="asc"
                />
              ) : (
                <EmptyState
                  size="sm"
                  title="暂无突变数据"
                  description="导入突变 CSV/VCF 文件后将在此展示突变位点"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {expandedPrimerId && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            variant="secondary"
            onClick={() => setExpandedPrimerId(null)}
            className="shadow-lg"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            收起详情
          </Button>
        </div>
      )}
    </div>
  );
}
