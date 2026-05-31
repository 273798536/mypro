import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, History, Building2, FileText, Calculator, ShieldCheck, AlertTriangle, Download } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { useThresholdStore } from '../stores/thresholdStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, AbnormalLevelBadge } from '../components/ui/Badge';
import { TraceTimeline } from '../components/TraceTimeline';
import { SpeedCurveChart } from '../components/charts/SpeedCurveChart';
import type { DataTrace, TraceStep } from '../types';
import { TRACE_STEP_LABELS } from '../utils/constants';
import {
  formatDistance,
  formatSpeed,
  formatTime,
  formatLoad,
  formatPercent,
  formatDateTime,
} from '../utils/helpers';

export const TracePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getRecordWithDetails, dataTraces, isLoading } = useDataStore();
  const { config: thresholdConfig } = useThresholdStore();
  const [activeStep, setActiveStep] = useState<TraceStep>('abnormal');

  const details = useMemo(() => {
    if (!id) return null;
    return getRecordWithDetails(id);
  }, [id, getRecordWithDetails]);

  const traces = useMemo(() => {
    if (!id) return [];
    return dataTraces.filter(t => t.recordId === id);
  }, [id, dataTraces]);

  const handleStepClick = (trace: DataTrace) => {
    setActiveStep(trace.traceStep);
  };

  const handleExportTrace = () => {
    if (!details) return;
    const exportData = {
      profile: details.profile,
      record: details.record,
      calculation: details.calculation,
      detection: details.detection,
      threshold: details.threshold,
      traces: traces,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trace-${details.record.elevatorNo}-${details.record.inspectionDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4" />
          <p className="text-slate-600">正在加载追溯数据...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">记录不存在</h3>
        <p className="text-slate-500 mb-6">未找到对应的检验记录</p>
        <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>
    );
  }

  const { profile, record, calculation, detection, threshold } = details;

  const theoreticalCurve = useMemo(() => {
    if (!record.ratedSpeed || !record.brakeTime) return [];
    const points = [];
    const deceleration = record.ratedSpeed / record.brakeTime;
    for (let t = 0; t <= record.brakeTime; t += 0.1) {
      points.push({ time: t, speed: Math.max(0, record.ratedSpeed - deceleration * t) });
    }
    return points;
  }, [record.ratedSpeed, record.brakeTime]);

  const actualCurve = record.speedCurve?.length > 0 ? record.speedCurve : [
    { time: 0, speed: record.actualSpeed || record.ratedSpeed },
    { time: record.brakeTime, speed: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-7 h-7 text-blue-900" />
              数据追溯
            </h1>
            <p className="text-slate-500 mt-1">
              {record.elevatorNo} · {record.inspectionDate} · {record.inspector}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {detection && <AbnormalLevelBadge level={detection.overallLevel} />}
          {detection && (
            <Badge variant={detection.overallResult === 'pass' ? 'success' : 'danger'}>
              {detection.overallResult === 'pass' ? '合格' : '不合格'}
            </Badge>
          )}
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportTrace}>
            导出追溯数据
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Building2 className="w-4 h-4" />
            电梯档案
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-500">型号:</span> <span className="font-medium">{profile?.model || '-'}</span></p>
            <p><span className="text-slate-500">额定载荷:</span> <span className="font-medium">{profile?.ratedLoad} kg</span></p>
            <p><span className="text-slate-500">额定速度:</span> <span className="font-medium">{formatSpeed(profile?.ratedSpeed || 0)}</span></p>
            <p><span className="text-slate-500">制造单位:</span> <span className="font-medium">{profile?.manufacturer || '-'}</span></p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <FileText className="w-4 h-4" />
            检验数据
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-500">实际载荷:</span> <span className="font-medium">{formatLoad(record.actualLoad)}</span></p>
            <p><span className="text-slate-500">载荷比:</span> <span className="font-medium">{formatPercent((record.actualLoad / record.ratedLoad) * 100)}</span></p>
            <p><span className="text-slate-500">实际速度:</span> <span className="font-medium">{formatSpeed(record.actualSpeed || record.ratedSpeed)}</span></p>
            <p><span className="text-slate-500">制动时间:</span> <span className="font-medium">{formatTime(record.brakeTime)}</span></p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Calculator className="w-4 h-4" />
            制动计算
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-500">理论距离:</span> <span className="font-mono font-medium">{formatDistance(calculation?.theoreticalBrakeDistance || 0)}</span></p>
            <p><span className="text-slate-500">实际距离:</span> <span className="font-mono font-medium">{formatDistance(calculation?.actualBrakeDistance || 0)}</span></p>
            <p><span className="text-slate-500">偏差:</span> <span className={`font-mono font-medium ${calculation?.deviationPercent && calculation.deviationPercent >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{calculation?.deviationPercent !== undefined ? `${calculation.deviationPercent >= 0 ? '+' : ''}${formatPercent(calculation.deviationPercent)}` : '-'}</span></p>
            <p><span className="text-slate-500">摩擦系数:</span> <span className="font-mono font-medium">{calculation?.frictionCoefficient.toFixed(3)}</span></p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <ShieldCheck className="w-4 h-4" />
            阈值校验
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-500">制动距离:</span> <Badge size="sm" variant={threshold?.brakeDistanceLevel === 'normal' ? 'success' : 'warning'}>{threshold?.brakeDistanceLevel ? (threshold.brakeDistanceLevel === 'normal' ? '合格' : '不合格') : '-'}</Badge></p>
            <p><span className="text-slate-500">速度缺口:</span> <Badge size="sm" variant={threshold?.speedGapLevel === 'normal' ? 'success' : 'warning'}>{threshold?.speedGapLevel ? (threshold.speedGapLevel === 'normal' ? '合格' : '不合格') : '-'}</Badge></p>
            <p><span className="text-slate-500">制动延迟:</span> <Badge size="sm" variant={threshold?.brakeDelayLevel === 'normal' ? 'success' : 'warning'}>{threshold?.brakeDelayLevel ? (threshold.brakeDelayLevel === 'normal' ? '合格' : '不合格') : '-'}</Badge></p>
            <p><span className="text-slate-500">载荷:</span> <Badge size="sm" variant={threshold?.loadLevel === 'normal' ? 'success' : 'danger'}>{threshold?.loadLevel ? (threshold.loadLevel === 'normal' ? '正常' : '超限') : '-'}</Badge></p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">处理链路</h2>
          <TraceTimeline
            traces={traces}
            onStepClick={handleStepClick}
            activeStep={activeStep}
          />
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">速度曲线分析</h2>
          <SpeedCurveChart
            actualCurve={actualCurve}
            theoreticalCurve={theoreticalCurve}
            speedGapThreshold={thresholdConfig.speedGapWarning}
            brakeStartTime={0}
            title={`${record.elevatorNo} - 速度曲线图`}
            height={350}
          />

          {detection && detection.detectedTypes.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                异常说明
              </h3>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">{detection.description}</p>
                {detection.detectedTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {detection.detectedTypes.map(type => (
                      <Badge
                        key={type}
                        variant={type === 'overload' ? 'danger' : type === 'speed_gap' ? 'warning' : 'info'}
                        size="sm"
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">计算详情</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">计算公式</p>
                <p className="font-mono text-sm text-slate-800">S = v² / (2 × g × f)</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">摩擦系数(修正后)</p>
                <p className="font-mono text-sm text-slate-800">{calculation?.frictionCoefficient.toFixed(4)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">合格范围</p>
                <p className="font-mono text-sm text-slate-800">
                  {formatDistance(calculation?.theoreticalBrakeDistance ? calculation.theoreticalBrakeDistance * (1 - thresholdConfig.brakeDistanceWarning) : 0)}
                  {' ~ '}
                  {formatDistance(calculation?.theoreticalBrakeDistance ? calculation.theoreticalBrakeDistance * (1 + thresholdConfig.brakeDistanceWarning) : 0)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">数据哈希</p>
                <p className="font-mono text-xs text-slate-500 truncate">{calculation?.dataHash || '-'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
