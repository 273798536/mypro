import { useMemo, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileJson,
  Download,
  Printer,
  Calendar,
  Hash,
  Target,
  FlaskConical,
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  Thermometer,
  Dna,
  Clock,
  ArrowRight,
  FileDown,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { exportToPdf } from '../lib/exporters/pdf';
import { exportToExcel } from '../lib/exporters/excel';
import type { AnalysisResult, PrimerPair, SampleResult, AnomalyRecord, MutationImpact } from '../lib/utils/types';
import { useNavigate } from 'react-router-dom';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function getStatusBadge(status: PrimerPair['status']) {
  const config = {
    valid: { variant: 'success' as const, label: '有效' },
    warning: { variant: 'warning' as const, label: '警告' },
    invalid: { variant: 'danger' as const, label: '无效' },
    needs_review: { variant: 'info' as const, label: '需审核' },
  }[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getSeverityBadge(severity: AnomalyRecord['severity']) {
  const config = {
    error: { variant: 'danger' as const, label: '严重' },
    warning: { variant: 'warning' as const, label: '警告' },
    info: { variant: 'info' as const, label: '提示' },
  }[severity];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getMismatchBadge(level: MutationImpact['mismatchLevel']) {
  const config = {
    critical: { variant: 'danger' as const, label: '关键' },
    high: { variant: 'warning' as const, label: '较高' },
    medium: { variant: 'warning' as const, label: '中等' },
    low: { variant: 'success' as const, label: '低' },
  }[level];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface ReportSectionProps {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}

function ReportSection({ title, icon: Icon, children }: ReportSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-700">
        <Icon className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function ReportPage() {
  const { analysisResult } = useAnalysisStore();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  const result = analysisResult;

  const mutationSeverityCounts = useMemo(() => {
    if (!result) return { critical: 0, high: 0, medium: 0, low: 0 };
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const impact of result.mutationImpacts) {
      counts[impact.mismatchLevel]++;
    }
    return counts;
  }, [result]);

  const handleExportPdf = () => {
    if (!result) return;
    setExporting('pdf');
    try {
      exportToPdf(result);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  const handleExportExcel = () => {
    if (!result) return;
    setExporting('excel');
    try {
      exportToExcel(result);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  const handleExportCsv = () => {
    if (!result) return;
    setExporting('csv');
    try {
      const primersCsv = [
        ['name', 'batch', 'forward_sequence', 'reverse_sequence', 'forward_tm', 'reverse_tm', 'status'].join(','),
        ...result.primerPairs.map((p) =>
          [p.name, p.batch || '', p.forward.sequence, p.reverse.sequence, p.forward.tm.toFixed(2), p.reverse.tm.toFixed(2), p.status].join(',')
        ),
      ].join('\n');

      const blob = new Blob(['\ufeff' + primersCsv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primer-report-${result.createdAt}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  if (!result) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <EmptyState
          size="lg"
          icon={<FileText className="h-16 w-16" />}
          title="暂无报告数据"
          description="请先完成数据分析，分析完成后将在此生成完整的分析报告"
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">报告预览与导出</h1>
          <p className="mt-1 text-sm text-neutral-500 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            报告生成时间: {formatDate(result.createdAt)}
            <span className="mx-1">·</span>
            <Hash className="h-3.5 w-3.5" />
            数据版本: {result.dataHash.slice(0, 12)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportPdf}
            loading={exporting === 'pdf'}
            leftIcon={<FileText className="h-4 w-4" />}
          >
            导出 PDF
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            loading={exporting === 'excel'}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            导出 Excel
          </Button>
          <Button
            onClick={handleExportCsv}
            loading={exporting === 'csv'}
            leftIcon={<FileJson className="h-4 w-4" />}
          >
            导出 CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="mx-auto bg-white shadow-2xl border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="p-12 space-y-8">
              <div className="text-center pb-6 border-b-2 border-neutral-800 dark:border-neutral-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Dna className="h-8 w-8 text-brand-600" />
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    引物覆盖分析报告
                  </h1>
                </div>
                <p className="text-sm text-neutral-500">
                  Virus Primer Coverage & Mutation Impact Assessment
                </p>
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(result.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {result.id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <ReportSection title="一、报告摘要" icon={FileText}>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">参考序列</span>
                      <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{result.reference.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">序列长度</span>
                      <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{result.reference.length.toLocaleString()} bp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">GC 含量</span>
                      <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{formatPercent(result.reference.gcContent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">引物总数</span>
                      <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{result.summary.totalPrimers} 对</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">有效引物</span>
                      <span className="font-mono font-medium text-success-700">{result.summary.validPrimers} 对</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">基因组覆盖率</span>
                      <span className="font-mono font-bold text-brand-700">{formatPercent(result.summary.coveragePercent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">覆盖缺口</span>
                      <span className={cn('font-mono font-medium', result.summary.gapCount > 0 ? 'text-danger-700' : 'text-success-700')}>
                        {result.summary.gapCount} 个
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">检测突变</span>
                      <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{result.mutations.length} 个</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        基因组覆盖度
                      </span>
                      <span className="font-mono font-bold">{formatPercent(result.summary.coveragePercent)}</span>
                    </div>
                    <Progress
                      value={result.summary.coveragePercent * 100}
                      size="sm"
                      variant={result.summary.coveragePercent >= 0.95 ? 'success' : result.summary.coveragePercent >= 0.8 ? 'warning' : 'danger'}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" />
                        引物合格率
                      </span>
                      <span className="font-mono font-bold">
                        {result.summary.totalPrimers > 0 ? ((result.summary.validPrimers / result.summary.totalPrimers) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <Progress
                      value={result.summary.totalPrimers > 0 ? (result.summary.validPrimers / result.summary.totalPrimers) * 100 : 0}
                      size="sm"
                      variant="default"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded bg-brand-50 p-2">
                    <div className="text-lg font-bold text-brand-700">{result.sampleResults.length}</div>
                    <div className="text-[10px] text-brand-600">样本数</div>
                  </div>
                  <div className="rounded bg-warning-50 p-2">
                    <div className="text-lg font-bold text-warning-700">{result.summary.anomalyCount}</div>
                    <div className="text-[10px] text-warning-600">异常数</div>
                  </div>
                  <div className="rounded bg-danger-50 p-2">
                    <div className="text-lg font-bold text-danger-700">{mutationSeverityCounts.critical}</div>
                    <div className="text-[10px] text-danger-600">关键错配</div>
                  </div>
                  <div className="rounded bg-success-50 p-2">
                    <div className="text-lg font-bold text-success-700">{result.summary.samplesNeedingAttention}</div>
                    <div className="text-[10px] text-success-600">需关注样本</div>
                  </div>
                </div>
              </ReportSection>

              <ReportSection title="二、分析参数配置" icon={Thermometer}>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-neutral-500">退火温度范围</span>
                    <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                      {result.config.minTm}°C ~ {result.config.maxTm}°C
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500">3'端关键碱基数</span>
                    <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                      {result.config.threePrimeCriticalBases} bp
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500">最大容忍错配数</span>
                    <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                      {result.config.maxAllowedMismatches}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500">最小产物大小</span>
                    <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                      {result.config.minimumAmpliconSize} bp
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500">最大产物大小</span>
                    <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                      {result.config.maximumAmpliconSize} bp
                    </div>
                  </div>
                </div>
              </ReportSection>

              <ReportSection title="三、引物质量评估" icon={FlaskConical}>
                <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-700">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">引物名称</th>
                        <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">批次</th>
                        <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">Tm(F/R)</th>
                        <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">产物</th>
                        <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.primerPairs.slice(0, 15).map((p) => (
                        <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800">
                          <td className="px-2 py-1 font-mono">{p.name}</td>
                          <td className="px-2 py-1 text-neutral-500">{p.batch || '-'}</td>
                          <td className="px-2 py-1 font-mono">
                            {p.forward.tm.toFixed(1)}/{p.reverse.tm.toFixed(1)}
                          </td>
                          <td className="px-2 py-1 font-mono">{p.productSize}bp</td>
                          <td className="px-2 py-1">{getStatusBadge(p.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.primerPairs.length > 15 && (
                  <p className="text-xs text-neutral-500 mt-1">
                    仅显示前 15 条，完整数据请查看导出文件（共 {result.primerPairs.length} 条）
                  </p>
                )}
              </ReportSection>

              {result.sampleResults.length > 0 && (
                <ReportSection title="四、样本分析建议" icon={Users}>
                  <div className="space-y-2">
                    {result.sampleResults.slice(0, 10).map((sample: SampleResult) => (
                      <div
                        key={sample.sampleId}
                        className={cn(
                          'rounded border p-3 text-xs',
                          sample.needsAlternativePrimers
                            ? 'border-warning-200 bg-warning-50 dark:bg-warning-900/20'
                            : 'border-success-200 bg-success-50 dark:bg-success-900/20'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                              {sample.sampleName}
                            </span>
                            {sample.needsAlternativePrimers ? (
                              <Badge variant="warning">需关注</Badge>
                            ) : (
                              <Badge variant="success">正常</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {sample.mutationCount} 突变
                            </span>
                            {sample.criticalMismatches.length > 0 && (
                              <span className="flex items-center gap-1 text-danger-600">
                                <AlertCircle className="h-3 w-3" />
                                {sample.criticalMismatches.length} 关键错配
                              </span>
                            )}
                          </div>
                        </div>
                        {sample.notes && (
                          <p className="mt-1.5 text-neutral-600 dark:text-neutral-400">
                            {sample.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {result.sampleResults.length > 10 && (
                    <p className="text-xs text-neutral-500">
                      仅显示前 10 条，完整数据请查看导出文件（共 {result.sampleResults.length} 条）
                    </p>
                  )}
                </ReportSection>
              )}

              {result.anomalies.length > 0 && (
                <ReportSection title="五、异常检测清单" icon={AlertTriangle}>
                  <div className="space-y-2">
                    {result.anomalies.slice(0, 10).map((anomaly: AnomalyRecord) => (
                      <div
                        key={anomaly.id}
                        className={cn(
                          'rounded border p-3 text-xs',
                          anomaly.severity === 'error' && 'border-danger-200 bg-danger-50 dark:bg-danger-900/20',
                          anomaly.severity === 'warning' && 'border-warning-200 bg-warning-50 dark:bg-warning-900/20',
                          anomaly.severity === 'info' && 'border-brand-200 bg-brand-50 dark:bg-brand-900/20'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {getSeverityBadge(anomaly.severity)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-800 dark:text-neutral-200">
                              {anomaly.message}
                            </p>
                            <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">建议: </span>
                              {anomaly.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.anomalies.length > 10 && (
                    <p className="text-xs text-neutral-500">
                      仅显示前 10 条，完整数据请查看导出文件（共 {result.anomalies.length} 条）
                    </p>
                  )}
                </ReportSection>
              )}

              {result.mutationImpacts.length > 0 && (
                <ReportSection title="六、突变影响评估" icon={Activity}>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="rounded bg-danger-50 p-2 text-center">
                      <div className="text-base font-bold text-danger-700">{mutationSeverityCounts.critical}</div>
                      <div className="text-[10px] text-danger-600">关键</div>
                    </div>
                    <div className="rounded bg-warning-50 p-2 text-center">
                      <div className="text-base font-bold text-warning-700">{mutationSeverityCounts.high}</div>
                      <div className="text-[10px] text-warning-600">较高</div>
                    </div>
                    <div className="rounded bg-brand-50 p-2 text-center">
                      <div className="text-base font-bold text-brand-700">{mutationSeverityCounts.medium}</div>
                      <div className="text-[10px] text-brand-600">中等</div>
                    </div>
                    <div className="rounded bg-success-50 p-2 text-center">
                      <div className="text-base font-bold text-success-700">{mutationSeverityCounts.low}</div>
                      <div className="text-[10px] text-success-600">低</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-700">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-100 dark:bg-neutral-800">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">样本</th>
                          <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">位置</th>
                          <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">引物</th>
                          <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">3'端</th>
                          <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">影响</th>
                          <th className="px-2 py-1.5 text-left font-medium text-neutral-600 dark:text-neutral-400">建议</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.mutationImpacts.slice(0, 12).map((impact, idx) => {
                          const mutation = result.mutations.find((m) => m.id === impact.mutationId);
                          const pair = result.primerPairs.find((p) => p.id === impact.primerPairId);
                          return (
                            <tr key={idx} className="border-t border-neutral-100 dark:border-neutral-800">
                              <td className="px-2 py-1 font-mono">{mutation?.sampleName || '-'}</td>
                              <td className="px-2 py-1 font-mono">{mutation?.position || '-'}</td>
                              <td className="px-2 py-1 font-mono">{pair?.name || '-'}</td>
                              <td className="px-2 py-1">
                                {impact.isThreePrimeMismatch ? (
                                  <Badge variant="danger">是</Badge>
                                ) : (
                                  <span className="text-neutral-400">否</span>
                                )}
                              </td>
                              <td className="px-2 py-1">{getMismatchBadge(impact.mismatchLevel)}</td>
                              <td className="px-2 py-1">
                                {impact.recommendation === 'replace' ? (
                                  <span className="text-danger-600">替换</span>
                                ) : impact.recommendation === 'caution' ? (
                                  <span className="text-warning-600">谨慎使用</span>
                                ) : (
                                  <span className="text-success-600">可用</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {result.mutationImpacts.length > 12 && (
                    <p className="text-xs text-neutral-500 mt-1">
                      仅显示前 12 条，完整数据请查看导出文件（共 {result.mutationImpacts.length} 条）
                    </p>
                  )}
                </ReportSection>
              )}

              <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-700 text-center">
                <p className="text-[10px] text-neutral-400 italic">
                  本报告由系统自动生成，仅供参考。关键发现请结合实验室验证。
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Report ID: {result.id} · Data Hash: {result.dataHash.slice(0, 16)}...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileDown className="h-4 w-4 text-brand-500" />
                报告导出
              </CardTitle>
              <CardDescription>选择需要的格式导出完整分析报告</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={handleExportPdf}
                loading={exporting === 'pdf'}
                leftIcon={<FileText className="h-4 w-4 text-danger-500" />}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">PDF 文档</span>
                  <span className="text-xs text-neutral-500">A4 排版，适合打印归档</span>
                </div>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={handleExportExcel}
                loading={exporting === 'excel'}
                leftIcon={<FileSpreadsheet className="h-4 w-4 text-success-500" />}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Excel 工作簿</span>
                  <span className="text-xs text-neutral-500">多 Sheet，含详细数据表</span>
                </div>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={handleExportCsv}
                loading={exporting === 'csv'}
                leftIcon={<FileJson className="h-4 w-4 text-brand-500" />}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">CSV 表格</span>
                  <span className="text-xs text-neutral-500">引物清单，通用格式</span>
                </div>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-brand-500" />
                报告信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">报告 ID</span>
                <span className="font-mono">{result.id.slice(0, 12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">生成时间</span>
                <span className="font-mono">{formatDate(result.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">数据版本</span>
                <span className="font-mono">{result.dataHash.slice(0, 12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">参考序列</span>
                <span className="font-mono truncate max-w-[140px]" title={result.reference.id}>
                  {result.reference.id.slice(0, 10)}
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="h-3.5 w-3.5" />}
                >
                  打印报告
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-brand-500" />
                快速导航
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/dashboard')}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                返回分析看板
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/anomalies')}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                处理异常项
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/import')}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                <Dna className="h-3.5 w-3.5 mr-1.5" />
                重新导入数据
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
