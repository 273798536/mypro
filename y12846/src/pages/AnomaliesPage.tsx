import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  HelpCircle,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
  GitCompareArrows,
  Clock,
  Sparkles,
  ArrowLeftRight,
  Eye,
  X,
  Dna,
  History,
  FlaskConical,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import type { AnomalyRecord, PrimerPair } from '../lib/utils/types';
import { getReverseComplement } from '../lib/parsers/fasta';
import { useNavigate } from 'react-router-dom';

interface AnomalyItemProps {
  anomaly: AnomalyRecord;
  primerPair?: PrimerPair;
  onMarkResolved: (id: string) => void;
  onViewDetail?: () => void;
}

const SEVERITY_CONFIG: Record<AnomalyRecord['severity'], {
  label: string;
  variant: 'danger' | 'warning' | 'info';
  icon: typeof AlertCircle;
  bg: string;
  border: string;
}> = {
  error: {
    label: '严重',
    variant: 'danger',
    icon: AlertCircle,
    bg: 'bg-danger-50',
    border: 'border-danger-200',
  },
  warning: {
    label: '警告',
    variant: 'warning',
    icon: AlertTriangle,
    bg: 'bg-warning-50',
    border: 'border-warning-200',
  },
  info: {
    label: '提示',
    variant: 'info',
    icon: Info,
    bg: 'bg-brand-50',
    border: 'border-brand-200',
  },
};

function AnomalyCard({ anomaly, primerPair, onMarkResolved, onViewDetail }: AnomalyItemProps) {
  const [resolved, setResolved] = useState(false);
  const severity = SEVERITY_CONFIG[anomaly.severity];
  const SeverityIcon = severity.icon;

  const handleResolve = () => {
    setResolved(true);
    onMarkResolved(anomaly.id);
  };

  if (resolved) {
    return (
      <div className="rounded-lg border border-success-200 bg-success-50 p-4 opacity-70">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100 text-success-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-success-700">已标记为已处理</p>
            <p className="text-xs text-success-600">{anomaly.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border p-4 transition-all hover:shadow-card', severity.bg, severity.border)}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0',
          anomaly.severity === 'error' && 'bg-danger-100 text-danger-600',
          anomaly.severity === 'warning' && 'bg-warning-100 text-warning-600',
          anomaly.severity === 'info' && 'bg-brand-100 text-brand-600'
        )}>
          <SeverityIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={severity.variant}>
                  <SeverityIcon className="h-3 w-3" />
                  {severity.label}
                </Badge>
                {primerPair && (
                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {primerPair.name}
                    {primerPair.batch && ` (${primerPair.batch})`}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {anomaly.message}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">建议: </span>
            {anomaly.suggestion}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {onViewDetail && (
              <Button size="sm" variant="ghost" onClick={onViewDetail}>
                <Eye className="h-3.5 w-3.5" />
                查看详情
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleResolve}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              标记已处理
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SequenceDiffProps {
  original: string;
  corrected: string;
  title: string;
}

function SequenceDiff({ original, corrected, title }: SequenceDiffProps) {
  const diffPositions: number[] = [];
  const maxLen = Math.max(original.length, corrected.length);
  for (let i = 0; i < maxLen; i++) {
    if (original[i] !== corrected[i]) diffPositions.push(i);
  }

  const BASE_COLORS: Record<string, string> = {
    A: 'text-blue-600', T: 'text-red-600', G: 'text-green-600', C: 'text-amber-600', N: 'text-neutral-500',
  };

  const renderSeq = (seq: string, isDiff: boolean) => (
    <div className="flex flex-wrap gap-0.5">
      {seq.split('').map((base, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold',
            diffPositions.includes(i) && isDiff
              ? 'bg-danger-100 border border-danger-300'
              : 'bg-neutral-50 border border-neutral-200',
            BASE_COLORS[base] || 'text-neutral-500'
          )}
        >
          {base}
        </span>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
        <div>
          <p className="mb-1.5 text-xs text-neutral-500">原始序列</p>
          {renderSeq(original, true)}
        </div>
        <div>
          <p className="mb-1.5 text-xs text-neutral-500">修正后序列</p>
          {renderSeq(corrected, true)}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <span className="text-xs text-neutral-500">
            差异位置: {diffPositions.length > 0 ? diffPositions.map((p) => p + 1).join(', ') : '无'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AnomaliesPage() {
  const { analysisResult } = useAnalysisStore();
  const navigate = useNavigate();
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    type: 'reversed' | 'ambiguity' | 'duplicate' | null;
    data: any;
  }>({ open: false, type: null, data: null });

  const result = analysisResult;

  const { reversedPrimers, ambiguityPrimers, duplicateNames, otherAnomalies } = useMemo(() => {
    if (!result) {
      return { reversedPrimers: [], ambiguityPrimers: [], duplicateNames: [], otherAnomalies: [] };
    }
    const reversed: Array<{ anomaly: AnomalyRecord; primerPair?: PrimerPair }> = [];
    const ambiguity: Array<{ anomaly: AnomalyRecord; primerPair?: PrimerPair }> = [];
    const duplicates: Array<{ anomaly: AnomalyRecord; primerPair?: PrimerPair }> = [];
    const others: Array<{ anomaly: AnomalyRecord; primerPair?: PrimerPair }> = [];

    for (const anomaly of result.anomalies) {
      if (resolvedIds.has(anomaly.id)) continue;
      const primerPair = result.primerPairs.find((p) => p.id === anomaly.primerPairId);
      const item = { anomaly, primerPair };
      switch (anomaly.type) {
        case 'reversed_primer':
          reversed.push(item);
          break;
        case 'ambiguity_base':
          ambiguity.push(item);
          break;
        case 'duplicate_name':
          duplicates.push(item);
          break;
        default:
          others.push(item);
      }
    }

    return { reversedPrimers: reversed, ambiguityPrimers: ambiguity, duplicateNames: duplicates, otherAnomalies: others };
  }, [result, resolvedIds]);

  const handleMarkResolved = (id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id));
  };

  const getDuplicateGroups = () => {
    if (!result) return new Map<string, PrimerPair[]>();
    const groups = new Map<string, PrimerPair[]>();
    for (const pair of result.primerPairs) {
      if (!groups.has(pair.name)) groups.set(pair.name, []);
      groups.get(pair.name)!.push(pair);
    }
    return new Map([...groups.entries()].filter(([, pairs]) => pairs.length > 1));
  };

  const duplicateGroups = getDuplicateGroups();

  if (!result) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <EmptyState
          size="lg"
          icon={<AlertTriangle className="h-16 w-16" />}
          title="暂无异常数据"
          description="请先完成数据分析，异常检测结果将在此展示"
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

  const totalUnresolved = reversedPrimers.length + ambiguityPrimers.length + duplicateNames.length + otherAnomalies.length;
  const errorCount = result.anomalies.filter((a) => a.severity === 'error' && !resolvedIds.has(a.id)).length;
  const warningCount = result.anomalies.filter((a) => a.severity === 'warning' && !resolvedIds.has(a.id)).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">异常检测中心</h1>
          <p className="mt-1 text-sm text-neutral-500">
            检测到 {totalUnresolved} 个待处理异常 ·
            <span className="text-danger-600 font-medium"> {errorCount} 严重</span> ·
            <span className="text-warning-600 font-medium"> {warningCount} 警告</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            <FlaskConical className="h-4 w-4" />
            返回看板
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-danger-200 bg-danger-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-100 text-danger-600">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-danger-700">反向引物写反</p>
                <p className="text-2xl font-bold text-danger-800">{reversedPrimers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning-200 bg-warning-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 text-warning-600">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-warning-700">含 N 碱基引物</p>
                <p className="text-2xl font-bold text-warning-800">{ambiguityPrimers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-brand-200 bg-brand-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <GitCompareArrows className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-700">同名不同批次</p>
                <p className="text-2xl font-bold text-brand-800">{duplicateGroups.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="reversed" className="p-6">
            <TabsList>
              <TabsTrigger value="reversed">
                <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                反向引物写反
                <Badge variant="danger" className="ml-2">{reversedPrimers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="ambiguity">
                <HelpCircle className="h-4 w-4 mr-1.5" />
                含 N 碱基
                <Badge variant="warning" className="ml-2">{ambiguityPrimers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="duplicate">
                <Copy className="h-4 w-4 mr-1.5" />
                同名不同批次
                <Badge variant="info" className="ml-2">{duplicateGroups.size}</Badge>
              </TabsTrigger>
              {(otherAnomalies.length > 0) && (
                <TabsTrigger value="others">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  其他异常
                  <Badge variant="default" className="ml-2">{otherAnomalies.length}</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="reversed">
              {reversedPrimers.length > 0 ? (
                <div className="space-y-4">
                  {reversedPrimers.map(({ anomaly, primerPair }) => (
                    <div key={anomaly.id}>
                      <AnomalyCard
                        anomaly={anomaly}
                        primerPair={primerPair}
                        onMarkResolved={handleMarkResolved}
                        onViewDetail={
                          primerPair
                            ? () =>
                                setDetailModal({
                                  open: true,
                                  type: 'reversed',
                                  data: { primerPair },
                                })
                            : undefined
                        }
                      />
                      {primerPair && (
                        <div className="mt-3 ml-12 space-y-3">
                          <SequenceDiff
                            title="反向引物序列对比"
                            original={primerPair.reverse.sequence}
                            corrected={getReverseComplement(primerPair.reverse.sequence)}
                          />
                          <div className="ml-0 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
                            <Sparkles className="mr-1.5 inline h-4 w-4" />
                            <span className="font-medium">修正建议: </span>
                            将反向引物序列替换为其反向互补序列，以确保正确的扩增方向
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  size="sm"
                  icon={<CheckCircle2 className="h-12 w-12 text-success-500" />}
                  title="反向引物方向正确"
                  description="所有反向引物方向检查均通过，未发现写反问题"
                />
              )}
            </TabsContent>

            <TabsContent value="ambiguity">
              {ambiguityPrimers.length > 0 ? (
                <div className="space-y-4">
                  {ambiguityPrimers.map(({ anomaly, primerPair }) => (
                    <div key={anomaly.id}>
                      <AnomalyCard
                        anomaly={anomaly}
                        primerPair={primerPair}
                        onMarkResolved={handleMarkResolved}
                      />
                      {primerPair && (
                        <div className="mt-3 ml-12 space-y-3">
                          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              N 碱基位置标记
                            </p>
                            <div className="space-y-3">
                              {(['forward', 'reverse'] as const).map((dir) => {
                                const primer = dir === 'forward' ? primerPair.forward : primerPair.reverse;
                                const nPositions = primer.ambiguityPositions || [];
                                if (nPositions.length === 0) return null;
                                return (
                                  <div key={dir}>
                                    <p className="mb-1 text-xs text-neutral-500">
                                      {dir === 'forward' ? '正向引物' : '反向引物'} · {nPositions.length} 个 N 碱基
                                    </p>
                                    <div className="flex flex-wrap gap-0.5">
                                      {primer.sequence.split('').map((base, i) => {
                                        const isN = base.toUpperCase() === 'N';
                                        return (
                                          <span
                                            key={i}
                                            className={cn(
                                              'inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold',
                                              isN
                                                ? 'bg-warning-200 border-2 border-warning-400 text-warning-800'
                                                : 'bg-neutral-50 border border-neutral-200',
                                              base === 'A' && !isN && 'text-blue-600',
                                              base === 'T' && !isN && 'text-red-600',
                                              base === 'G' && !isN && 'text-green-600',
                                              base === 'C' && !isN && 'text-amber-600'
                                            )}
                                            title={isN ? `位置 ${i + 1}: 模糊碱基 N` : `位置 ${i + 1}`}
                                          >
                                            {base}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <p className="mt-1 text-xs text-warning-600">
                                      N 位置: {nPositions.map((p) => p + 1).join(', ')}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700">
                            <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                            <span className="font-medium">警告说明: </span>
                            模糊碱基 N 会降低引物结合特异性，可能导致非特异性扩增。建议确认测序质量或重新设计引物
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  size="sm"
                  icon={<CheckCircle2 className="h-12 w-12 text-success-500" />}
                  title="引物序列质量良好"
                  description="所有引物序列不含模糊碱基 N，序列质量检查通过"
                />
              )}
            </TabsContent>

            <TabsContent value="duplicate">
              {duplicateGroups.size > 0 ? (
                <div className="space-y-6">
                  {[...duplicateGroups.entries()].map(([name, pairs]) => (
                    <Card key={name}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Copy className="h-4 w-4 text-brand-500" />
                          引物名称重复: <span className="font-mono">{name}</span>
                          <Badge variant="info">{pairs.length} 个版本</Badge>
                        </CardTitle>
                        <CardDescription>
                          同名引物存在多个批次版本，请检查是否为同一引物的不同设计或重名
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                          <table className="w-full text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-800">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">批次</th>
                                <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">正向序列</th>
                                <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">反向序列</th>
                                <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Tm (正/反)</th>
                                <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">产物大小</th>
                                <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">状态</th>
                                <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">差异</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pairs.map((pair, idx) => {
                                const prevPair = idx > 0 ? pairs[idx - 1] : null;
                                const hasForwardDiff = prevPair && prevPair.forward.sequence !== pair.forward.sequence;
                                const hasReverseDiff = prevPair && prevPair.reverse.sequence !== pair.reverse.sequence;
                                const hasDiff = hasForwardDiff || hasReverseDiff;
                                return (
                                  <tr key={pair.id} className="border-t border-neutral-100 dark:border-neutral-800">
                                    <td className="px-4 py-2">
                                      <span className="inline-flex items-center gap-1">
                                        <History className="h-3 w-3 text-neutral-400" />
                                        <span className="font-mono text-xs">{pair.batch || '未标注'}</span>
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                      <span className={cn(hasForwardDiff && 'bg-warning-100 px-1 rounded text-warning-800')}>
                                        {pair.forward.sequence.slice(0, 20)}...
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                      <span className={cn(hasReverseDiff && 'bg-warning-100 px-1 rounded text-warning-800')}>
                                        {pair.reverse.sequence.slice(0, 20)}...
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                      {pair.forward.tm.toFixed(1)} / {pair.reverse.tm.toFixed(1)}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">{pair.productSize}bp</td>
                                    <td className="px-4 py-2">
                                      <Badge
                                        variant={
                                          pair.status === 'valid'
                                            ? 'success'
                                            : pair.status === 'warning'
                                            ? 'warning'
                                            : pair.status === 'invalid'
                                            ? 'danger'
                                            : 'info'
                                        }
                                      >
                                        {pair.status}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2">
                                      {idx === 0 ? (
                                        <span className="text-xs text-neutral-400">基准版本</span>
                                      ) : hasDiff ? (
                                        <Badge variant="warning">序列有差异</Badge>
                                      ) : (
                                        <Badge variant="success">序列一致</Badge>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            版本历史: {pairs.map((p) => p.batch || '未标注').join(' → ')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  size="sm"
                  icon={<CheckCircle2 className="h-12 w-12 text-success-500" />}
                  title="引物命名唯一"
                  description="所有引物名称均为唯一标识，未发现重名问题"
                />
              )}
            </TabsContent>

            {otherAnomalies.length > 0 && (
              <TabsContent value="others">
                <div className="space-y-4">
                  {otherAnomalies.map(({ anomaly, primerPair }) => (
                    <AnomalyCard
                      key={anomaly.id}
                      anomaly={anomaly}
                      primerPair={primerPair}
                      onMarkResolved={handleMarkResolved}
                    />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, type: null, data: null })}
        title="反向引物方向修正详情"
        description="对比原始序列与修正后的反向互补序列"
        size="lg"
      >
        {detailModal.type === 'reversed' && detailModal.data?.primerPair && (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
              <ArrowRightLeft className="mr-1.5 inline h-4 w-4" />
              <span className="font-medium">检测结果: </span>
              该反向引物可能写反，建议使用反向互补序列
            </div>
            <SequenceDiff
              title="序列对比"
              original={detailModal.data.primerPair.reverse.sequence}
              corrected={getReverseComplement(detailModal.data.primerPair.reverse.sequence)}
            />
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">引物完整信息</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500">引物名称: </span>
                  <span className="font-mono">{detailModal.data.primerPair.name}</span>
                </div>
                <div>
                  <span className="text-neutral-500">批次: </span>
                  <span className="font-mono">{detailModal.data.primerPair.batch || '-'}</span>
                </div>
                <div>
                  <span className="text-neutral-500">原始长度: </span>
                  <span className="font-mono">{detailModal.data.primerPair.reverse.length}bp</span>
                </div>
                <div>
                  <span className="text-neutral-500">原始 Tm: </span>
                  <span className="font-mono">{detailModal.data.primerPair.reverse.tm.toFixed(1)}°C</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
