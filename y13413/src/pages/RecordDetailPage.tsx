import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, History, ArrowRight, AlertTriangle } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import Tooltip from '@/components/ui/Tooltip';
import { useRecordStore } from '@/store/useRecordStore';
import { useBatchStore } from '@/store/useBatchStore';
import type { ReviewRecord, RecordVersion, Anomaly } from '@/types';
import { cn } from '@/lib/utils';

const statusTextMap: Record<ReviewRecord['status'], string> = {
  new: '待审核',
  reviewing: '审核中',
  approved: '已通过',
  skipped: '已跳过',
  anomaly: '异常',
  normal: '正常',
};

const statusBadgeVariant: Record<ReviewRecord['status'], 'normal' | 'anomaly' | 'new' | 'skipped' | 'info'> = {
  normal: 'normal',
  anomaly: 'anomaly',
  new: 'new',
  skipped: 'skipped',
  reviewing: 'info',
  approved: 'normal',
};

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    records,
    currentRecord,
    anomalies,
    initMock,
    getRecordById,
    setCurrentRecord,
    switchVersion,
  } = useRecordStore();
  const { batches, initMock: initBatchMock } = useBatchStore();
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<RecordVersion | null>(null);
  const [recordAnomalies, setRecordAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    if (records.length === 0) {
      initMock();
    }
    if (batches.length === 0) {
      initBatchMock();
    }
  }, [records.length, batches.length, initMock, initBatchMock]);

  useEffect(() => {
    if (id) {
      setCurrentRecord(id);
      const record = getRecordById(id);
      if (record) {
        setSelectedVersionId(record.currentVersionId);
        const version = record.versions.find((v) => v.id === record.currentVersionId);
        setCurrentVersion(version || null);
        setRecordAnomalies(anomalies.filter((a) => a.recordId === id));
      }
    }
    return () => {
      setCurrentRecord(null);
    };
  }, [id, records, anomalies, getRecordById, setCurrentRecord]);

  const handleVersionChange = (versionId: string) => {
    if (!id) return;
    const version = switchVersion(id, versionId);
    setSelectedVersionId(versionId);
    setCurrentVersion(version || null);
  };

  const batch = batches.find((b) => b.id === currentRecord?.batchId);
  const latestVersion = currentRecord?.versions[currentRecord.versions.length - 1];

  if (!currentRecord) {
    return (
      <PageContainer title="记录详情" subtitle="加载中...">
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" />}
          title="未找到记录"
          description="该记录不存在或已被删除，请返回档案列表重新选择。"
          action={
            <Link to="/records">
              <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                返回档案
              </Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="记录详情"
      subtitle={currentRecord.recordNo || currentRecord.recordKey || '加载中...'}
      actions={
        <>
          <Link to="/records">
            <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
              返回档案
            </Button>
          </Link>
          <Tooltip content="查看该记录的所有历史版本">
            <Button variant="ghost" icon={<History className="w-4 h-4" />}>
              查看全部版本
            </Button>
          </Tooltip>
        </>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-charcoal-500 font-serif mb-1">记录编号</p>
              <p className="font-mono text-lg text-ink-700 font-semibold">
                {currentRecord.recordNo || currentRecord.recordKey}
              </p>
            </div>
            <div>
              <p className="text-xs text-charcoal-500 font-serif mb-1">来源文件</p>
              <p className="font-mono text-sm text-charcoal-700">{currentRecord.sourceFile}</p>
            </div>
            <div>
              <p className="text-xs text-charcoal-500 font-serif mb-1">创建时间</p>
              <p className="font-mono text-sm text-charcoal-700">{currentRecord.createdAt}</p>
            </div>
            <div>
              <p className="text-xs text-charcoal-500 font-serif mb-1">当前状态</p>
              <Badge variant={statusBadgeVariant[currentRecord.status]}>
                {statusTextMap[currentRecord.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-charcoal-500 font-serif mb-1">所属批次</p>
              <p className="font-mono text-sm text-charcoal-700">
                {batch?.name || currentRecord.batchId}
              </p>
            </div>
            <div>
              <p className="text-xs text-charcoal-500 font-serif mb-1">最新版本号</p>
              <p className="font-mono text-sm text-ink-600">
                <span className="inline-block px-2 py-0.5 bg-ink-50 border border-ink-200 rounded-sm">
                  v{latestVersion?.version || latestVersion?.versionNumber}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Select
              label="版本切换"
              value={selectedVersionId}
              onChange={handleVersionChange}
              options={currentRecord.versions.map((v) => ({
                value: v.id,
                label: `版本 v${v.version || v.versionNumber} - ${v.createdAt}`,
              }))}
            />
          </CardContent>
        </Card>

        {currentVersion?.computationTrace && (
          <div>
            <div className="mb-4">
              <h2 className="font-serif text-lg font-bold text-ink-700">计算过程追踪</h2>
              <p className="text-xs text-charcoal-500 mt-1">
                标注「拉动因素」表示该步显著影响最终结果
              </p>
            </div>
            <div className="space-y-4">
              {currentVersion.computationTrace.map((step) => (
                <div
                  key={step.step}
                  className={cn(
                    'bg-parchment-50 border border-parchment-200 rounded-md shadow-parchment overflow-hidden',
                    step.isDrivingFactor && 'border-l-4 border-l-vermilion-500'
                  )}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-ink-600 text-white flex items-center justify-center font-serif flex-shrink-0 text-sm font-semibold">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <h4 className="font-serif font-bold text-ink-700">{step.description}</h4>
                          <span className="font-mono italic text-ink-600 text-sm">
                            {step.formula}
                          </span>
                          {step.isDrivingFactor && (
                            <Badge variant="anomaly">拉动因素</Badge>
                          )}
                        </div>
                        <div className="mb-3">
                          <p className="text-xs text-charcoal-500 font-serif mb-1.5">输入参数</p>
                          <div className="grid grid-cols-2 gap-2 bg-white px-4 py-3 rounded-sm border border-parchment-200">
                            {Object.entries(step.input).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-xs text-charcoal-500 font-mono">{key}</span>
                                <span className="text-sm text-charcoal-700 font-mono">
                                  {JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs text-charcoal-500 font-serif mb-1.5">输出结果</p>
                          <p className="text-2xl font-mono font-bold text-ink-700">
                            {JSON.stringify(step.output)}
                          </p>
                        </div>
                        {step.isDrivingFactor && step.drivingFactorNote && (
                          <div className="flex items-start gap-2 bg-vermilion-50 border border-vermilion-200 px-4 py-3 rounded-sm">
                            <ArrowRight className="w-4 h-4 text-vermilion-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-vermilion-700 font-serif">
                              {step.drivingFactorNote}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentVersion?.boundaryCheck && (
          <div>
            <h2 className="font-serif text-lg font-bold text-ink-700 mb-4">边界复核区</h2>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <Card>
                <CardHeader>
                  <CardTitle>外推越界前</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-charcoal-500 font-serif mb-1">数值</p>
                    <p className="text-xl font-mono font-bold text-ink-700">
                      {currentVersion.boundaryCheck.beforeExtrapolation.value}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500 font-serif mb-1">来源</p>
                    <p className="text-sm font-mono text-charcoal-700">
                      {currentVersion.boundaryCheck.beforeExtrapolation.source}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500 font-serif mb-1">状态</p>
                    <Badge
                      variant={
                        currentVersion.boundaryCheck.beforeExtrapolation.status === 'exceeded'
                          ? 'anomaly'
                          : 'normal'
                      }
                    >
                      {currentVersion.boundaryCheck.beforeExtrapolation.status === 'exceeded'
                        ? '越界'
                        : '正常范围'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>外推越界后</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-charcoal-500 font-serif mb-1">数值</p>
                    <p className="text-xl font-mono font-bold text-ink-700">
                      {currentVersion.boundaryCheck.afterExtrapolation.value}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500 font-serif mb-1">处理方法</p>
                    <p className="text-sm font-mono text-charcoal-700">
                      {currentVersion.boundaryCheck.afterExtrapolation.method}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500 font-serif mb-1">状态</p>
                    <Badge
                      variant={
                        currentVersion.boundaryCheck.afterExtrapolation.status === 'exceeded'
                          ? 'anomaly'
                          : 'normal'
                      }
                    >
                      {currentVersion.boundaryCheck.afterExtrapolation.status === 'exceeded'
                        ? '越界'
                        : '正常范围'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-serif font-medium text-ink-700 mb-2">一致性校验</p>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-charcoal-500 mb-1">页面数值</p>
                        <p className="font-mono text-ink-700 font-semibold">
                          {currentVersion.boundaryCheck.consistencyCheck.pageValue}
                        </p>
                      </div>
                      <div className="text-charcoal-300">/</div>
                      <div className="text-center">
                        <p className="text-xs text-charcoal-500 mb-1">表格数值</p>
                        <p className="font-mono text-ink-700 font-semibold">
                          {currentVersion.boundaryCheck.consistencyCheck.tableValue}
                        </p>
                      </div>
                      <div className="text-charcoal-300">/</div>
                      <div className="text-center">
                        <p className="text-xs text-charcoal-500 mb-1">导出数值</p>
                        <p className="font-mono text-ink-700 font-semibold">
                          {currentVersion.boundaryCheck.consistencyCheck.exportValue}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      currentVersion.boundaryCheck.consistencyCheck.isConsistent
                        ? 'normal'
                        : 'anomaly'
                    }
                    className="px-3 py-1.5 text-sm"
                  >
                    {currentVersion.boundaryCheck.consistencyCheck.isConsistent
                      ? '三值一致 ✓'
                      : '不一致 ✗'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {recordAnomalies.length > 0 && (
          <div>
            <h2 className="font-serif text-lg font-bold text-ink-700 mb-4">异常关联</h2>
            <div className="space-y-3">
              {recordAnomalies.map((anomaly) => (
                <Card key={anomaly.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="anomaly">{anomaly.type}</Badge>
                          <Badge variant={anomaly.severity === 'high' ? 'anomaly' : anomaly.severity === 'medium' ? 'info' : 'skipped'}>
                            {anomaly.severity === 'high' ? '严重' : anomaly.severity === 'medium' ? '中等' : '轻微'}
                          </Badge>
                        </div>
                        <p className="text-sm text-charcoal-700 font-serif mb-2">
                          {anomaly.description}
                        </p>
                        {anomaly.suggestion && (
                          <p className="text-xs text-charcoal-500 font-serif">
                            <span className="font-semibold">处理建议：</span>
                            {anomaly.suggestion}
                          </p>
                        )}
                      </div>
                      <AlertTriangle className="w-5 h-5 text-vermilion-500 flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
