import { useParams } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, ArrowRight, FileText, Link2, GitCompare } from 'lucide-react';
import { getSnapshotById } from '@/data/mockSnapshots';
import { getPresetVersionById } from '@/data/mockPresets';
import { getAnomaliesByEntityId } from '@/data/mockAnomalies';
import { calculateDifference, calculatePercentage } from '@/utils/parameterUtils';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import type { SnapshotParameter, PresetParameter } from '@/types';
import { cn } from '@/lib/utils';

interface ParameterRowProps {
  baselineParam: PresetParameter;
  snapshotParam: SnapshotParameter;
}

function ParameterRow({ baselineParam, snapshotParam }: ParameterRowProps) {
  const diff = calculateDifference(baselineParam.value, snapshotParam.value);
  const percentage = calculatePercentage(baselineParam.value, snapshotParam.value);
  const hasDiff = diff !== 0;

  const rowBg = snapshotParam.isOutOfBounds
    ? 'bg-destructive/10'
    : snapshotParam.isModified
    ? 'bg-warning/10'
    : 'bg-card';

  return (
    <div className={cn('grid grid-cols-12 gap-4 items-center p-4 border-b border-border', rowBg)}>
      <div className="col-span-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{baselineParam.name}</span>
          {snapshotParam.isOutOfBounds && (
            <span className="text-xs font-medium text-destructive bg-destructive/20 px-2 py-0.5 rounded">
              {snapshotParam.boundsStatus === 'below_min' ? '低于下限' : '高于上限'}
            </span>
          )}
          {!snapshotParam.isOutOfBounds && snapshotParam.isModified && (
            <span className="text-xs font-medium text-warning bg-warning/20 px-2 py-0.5 rounded">
              已修改
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{baselineParam.path}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className={cn(
            'text-lg font-semibold',
            snapshotParam.isOutOfBounds ? 'text-destructive' : snapshotParam.isModified ? 'text-warning' : 'text-foreground'
          )}>
            {baselineParam.value.toFixed(2)}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground">{baselineParam.unit}</span>
          </span>
        </div>
        {snapshotParam.isOutOfBounds && (
          <p className="text-xs text-destructive mt-1">
            合理范围: [{baselineParam.minValue}, {baselineParam.maxValue}]
          </p>
        )}
      </div>

      <div className="col-span-4 flex justify-center">
        <div className="flex items-center gap-2">
          {hasDiff ? (
            <>
              {diff > 0 ? (
                <ArrowUpRight className="h-5 w-5 text-destructive" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-success" />
              )}
              <span className={cn(
                'text-sm font-medium',
                diff > 0 ? 'text-destructive' : 'text-success'
              )}>
                {diff > 0 ? '+' : ''}{diff.toFixed(2)} ({percentage.toFixed(1)}%)
              </span>
            </>
          ) : (
            <>
              <ArrowRight className="h-5 w-5 text-muted-foreground/70" />
              <span className="text-sm text-muted-foreground/70">无变化</span>
            </>
          )}
        </div>
      </div>

      <div className="col-span-4">
        <div className="flex items-center gap-3 justify-end">
          <span className={cn(
            'text-lg font-semibold',
            snapshotParam.isOutOfBounds ? 'text-destructive' : snapshotParam.isModified ? 'text-warning' : 'text-foreground'
          )}>
            {snapshotParam.value.toFixed(2)}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground">{baselineParam.unit}</span>
          </span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{baselineParam.minValue}</span>
            <span>{baselineParam.maxValue}</span>
          </div>
          <div className="relative mt-1 h-2 rounded-full bg-border">
            <div
              className={cn(
                'absolute left-0 top-0 h-full rounded-full',
                snapshotParam.isOutOfBounds
                  ? 'bg-destructive'
                  : snapshotParam.isModified
                  ? 'bg-warning'
                  : 'bg-primary'
              )}
              style={{
                width: `${Math.min(100, Math.max(0, ((snapshotParam.value - baselineParam.minValue) / (baselineParam.maxValue - baselineParam.minValue)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SnapshotDetail() {
  const { id } = useParams<{ id: string }>();
  const snapshot = getSnapshotById(id || '');
  const presetVersion = snapshot ? getPresetVersionById(snapshot.presetVersionId) : undefined;
  const anomalies = snapshot ? getAnomaliesByEntityId(snapshot.id) : [];

  if (!snapshot || !presetVersion) {
    return (
      <EmptyState
        title="快照不存在"
        description="您访问的快照可能已被删除或不存在"
      />
    );
  }

  const getParamById = (paramId: string) => 
    presetVersion.parameters.find(p => p.id === paramId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{snapshot.name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{snapshot.notes}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">关联预设版本</p>
              <p className="mt-1 font-medium text-foreground">
                {presetVersion.name} (v{presetVersion.versionNumber})
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">预设名称</p>
              <p className="mt-1 font-medium text-foreground">{snapshot.presetName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">创建者</p>
              <p className="mt-1 font-medium text-foreground">{snapshot.creatorName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">创建时间</p>
              <p className="mt-1 font-medium text-foreground">
                {new Date(snapshot.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          {snapshot.comparisonResult && (
            <div className="mt-4 flex gap-4">
              <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm">
                总参数: {snapshot.comparisonResult.totalParameters}
              </div>
              <div className="bg-warning/10 text-warning px-3 py-1.5 rounded-lg text-sm">
                已修改: {snapshot.comparisonResult.modifiedCount}
              </div>
              <div className="bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-sm">
                越界: {snapshot.comparisonResult.outOfBoundsCount}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>参数对比</CardTitle>
          <div className="grid grid-cols-12 gap-4 mt-2 text-sm text-muted-foreground">
            <div className="col-span-4">基线参数 (预设版本)</div>
            <div className="col-span-4 text-center">差异</div>
            <div className="col-span-4 text-right">快照参数</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {snapshot.parameters.map((snapParam) => {
            const baselineParam = getParamById(snapParam.parameterId);
            if (!baselineParam) return null;
            return (
              <ParameterRow
                key={snapParam.parameterId}
                baselineParam={baselineParam}
                snapshotParam={snapParam}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>异常告警</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {anomalies.length > 0 ? (
            anomalies.map((anomaly) => (
              <Alert key={anomaly.id} anomaly={anomaly} />
            ))
          ) : (
            <EmptyState
              title="无异常"
              description="该快照未检测到任何异常"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" leftIcon={<GitCompare className="h-4 w-4" />}>
            对比新版本
          </Button>
          <Button variant="secondary" leftIcon={<FileText className="h-4 w-4" />}>
            导出报告
          </Button>
          <Button leftIcon={<Link2 className="h-4 w-4" />}>
            关联到作业
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
