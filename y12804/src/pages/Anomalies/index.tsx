import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import LineChart from '@/components/Chart/LineChart';
import {
  AlertTriangle,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  FileText,
  Info,
  AlertOctagon,
  ArrowRight,
  X,
} from 'lucide-react';
import type { Anomaly, AnomalyCategory, AnomalySeverity } from '@/types';
import { formatDateTime } from '@/utils/common';

export default function AnomaliesPage() {
  const {
    anomalies,
    samples,
    updateAnomalyStatus,
  } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState<AnomalyCategory | 'all'>('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

  const supplementAnomalies = useMemo(
    () => anomalies.filter((a) => a.category === 'supplement'),
    [anomalies]
  );

  const recalibrationAnomalies = useMemo(
    () => anomalies.filter((a) => a.category === 'recalibration'),
    [anomalies]
  );

  const pendingAnomalies = useMemo(
    () => anomalies.filter((a) => a.status === 'pending'),
    [anomalies]
  );

  const processingAnomalies = useMemo(
    () => anomalies.filter((a) => a.status === 'processing'),
    [anomalies]
  );

  const resolvedAnomalies = useMemo(
    () => anomalies.filter((a) => a.status === 'resolved'),
    [anomalies]
  );

  const filteredAnomalies = useMemo(() => {
    if (selectedCategory === 'all') return anomalies;
    return anomalies.filter((a) => a.category === selectedCategory);
  }, [anomalies, selectedCategory]);

  const severityChartData = useMemo(() => {
    const severities: AnomalySeverity[] = ['low', 'medium', 'high', 'critical'];
    return severities.map((s) => ({
      label: getSeverityLabel(s),
      value: anomalies.filter((a) => a.severity === s).length,
      status: (s === 'critical' || s === 'high' ? 'abnormal' : 'normal') as 'normal' | 'warning' | 'abnormal',
    }));
  }, [anomalies]);

  function getSeverityLabel(severity: AnomalySeverity): string {
    const map: Record<AnomalySeverity, string> = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '紧急',
    };
    return map[severity];
  }

  function getStatusLabel(status: Anomaly['status']): string {
    const map: Record<Anomaly['status'], string> = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
    };
    return map[status];
  }

  function getCategoryLabel(category: AnomalyCategory): string {
    const map: Record<AnomalyCategory, string> = {
      supplement: '补材料',
      recalibration: '改口径',
    };
    return map[category];
  }

  const getSampleBarcode = (sampleId: string | null) => {
    if (!sampleId) return '-';
    const sample = samples.find((s) => s.id === sampleId);
    return sample?.barcode || '-';
  };

  const stats = [
    {
      label: '待处理',
      value: pendingAnomalies.length,
      icon: Clock,
      color: 'text-supplement-600',
      bg: 'bg-supplement-50',
      border: 'border-supplement-200',
    },
    {
      label: '处理中',
      value: processingAnomalies.length,
      icon: AlertTriangle,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      border: 'border-warning-200',
    },
    {
      label: '已解决',
      value: resolvedAnomalies.length,
      icon: CheckCircle,
      color: 'text-success-600',
      bg: 'bg-success-50',
      border: 'border-success-200',
    },
    {
      label: '需补材料',
      value: supplementAnomalies.length,
      icon: Plus,
      color: 'text-supplement-600',
      bg: 'bg-supplement-50',
      border: 'border-supplement-300',
    },
    {
      label: '需改口径',
      value: recalibrationAnomalies.length,
      icon: TrendingUp,
      color: 'text-recalibration-600',
      bg: 'bg-recalibration-50',
      border: 'border-recalibration-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-md shadow-card border ${stat.border} p-4`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-md flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">{stat.label}</p>
                  <p className="text-xl font-bold text-primary-800">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-1 p-5 rounded-md border-2 transition-all ${
                selectedCategory === 'all'
                  ? 'border-medical-500 bg-medical-50'
                  : 'border-neutral-200 bg-white hover:border-primary-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-md flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-primary-800">全部异常</p>
                  <p className="text-2xl font-bold text-primary-800 mt-1">
                    {anomalies.length}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    含所有类型的异常记录
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory('supplement')}
              className={`flex-1 p-5 rounded-md border-2 transition-all ${
                selectedCategory === 'supplement'
                  ? 'border-supplement-500 bg-supplement-50'
                  : 'border-neutral-200 bg-white hover:border-supplement-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-supplement-100 rounded-md flex items-center justify-center">
                  <Plus className="w-6 h-6 text-supplement-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-supplement-800">需补材料</p>
                  <p className="text-2xl font-bold text-supplement-700 mt-1">
                    {supplementAnomalies.length}
                  </p>
                  <p className="text-xs text-supplement-500 mt-0.5">
                    数据缺失、信息不全
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedCategory('recalibration')}
              className={`flex-1 p-5 rounded-md border-2 transition-all ${
                selectedCategory === 'recalibration'
                  ? 'border-recalibration-500 bg-recalibration-50'
                  : 'border-neutral-200 bg-white hover:border-recalibration-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-recalibration-100 rounded-md flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-recalibration-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-recalibration-800">需改口径</p>
                  <p className="text-2xl font-bold text-recalibration-700 mt-1">
                    {recalibrationAnomalies.length}
                  </p>
                  <p className="text-xs text-recalibration-500 mt-0.5">
                    质控超限、方法差异
                  </p>
                </div>
              </div>
            </button>
          </div>

          <Card
            title="异常列表"
            subtitle={`共 ${filteredAnomalies.length} 条异常记录`}
          >
            <div className="space-y-3">
              {filteredAnomalies.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无异常记录</p>
                </div>
              ) : (
                filteredAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    onClick={() => setSelectedAnomaly(anomaly)}
                    className={`p-4 rounded-md border cursor-pointer transition-all hover:shadow-md ${
                      anomaly.category === 'supplement'
                        ? 'border-supplement-200 bg-supplement-50/30 hover:bg-supplement-50'
                        : 'border-recalibration-200 bg-recalibration-50/30 hover:bg-recalibration-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-primary-800">
                            {anomaly.type}
                          </h4>
                          <Badge
                            variant={
                              anomaly.category === 'supplement'
                                ? 'supplement'
                                : 'recalibration'
                            }
                          >
                            {getCategoryLabel(anomaly.category)}
                          </Badge>
                          <Badge
                            variant={
                              anomaly.severity === 'critical'
                                ? 'danger'
                                : anomaly.severity === 'high'
                                ? 'supplement'
                                : anomaly.severity === 'medium'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {getSeverityLabel(anomaly.severity)}
                          </Badge>
                          <Badge
                            variant={
                              anomaly.status === 'resolved'
                                ? 'success'
                                : anomaly.status === 'processing'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {getStatusLabel(anomaly.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-600 mb-2">
                          {anomaly.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            影响 {anomaly.affectedSamples.length} 个样本
                          </span>
                          <span>
                            创建时间: {formatDateTime(anomaly.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 mt-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="异常严重程度分布">
            <LineChart data={severityChartData} height={200} />
            <div className="mt-3 p-3 bg-neutral-50 rounded-md">
              <p className="text-xs text-neutral-600">
                <strong>图表说明：</strong>
              </p>
              <ul className="text-xs text-neutral-500 mt-1 space-y-1">
                <li>• 低：不影响质控结果，可延后处理</li>
                <li>• 中：可能影响部分结果，建议尽快处理</li>
                <li>• 高：直接影响质控结果，需优先处理</li>
                <li>• 紧急：严重影响数据质量，需立即处理</li>
              </ul>
            </div>
          </Card>

          {selectedAnomaly ? (
            <Card title="异常详情">
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold text-primary-800 mb-1">
                    {selectedAnomaly.type}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedAnomaly.category === 'supplement'
                          ? 'supplement'
                          : 'recalibration'
                      }
                    >
                      {getCategoryLabel(selectedAnomaly.category)}
                    </Badge>
                    <Badge
                      variant={
                        selectedAnomaly.severity === 'critical'
                          ? 'danger'
                          : selectedAnomaly.severity === 'high'
                          ? 'supplement'
                          : 'warning'
                      }
                    >
                      {getSeverityLabel(selectedAnomaly.severity)}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-md">
                  <h5 className="text-sm font-medium text-primary-700 mb-2">
                    异常描述
                  </h5>
                  <p className="text-sm text-neutral-600">
                    {selectedAnomaly.description}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-md border ${
                    selectedAnomaly.category === 'supplement'
                      ? 'bg-supplement-50 border-supplement-200'
                      : 'bg-recalibration-50 border-recalibration-200'
                  }`}
                >
                  <h5
                    className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                      selectedAnomaly.category === 'supplement'
                        ? 'text-supplement-800'
                        : 'text-recalibration-800'
                    }`}
                  >
                    <Info className="w-4 h-4" />
                    处理方向：{getCategoryLabel(selectedAnomaly.category)}
                  </h5>
                  <p
                    className={`text-sm ${
                      selectedAnomaly.category === 'supplement'
                        ? 'text-supplement-700'
                        : 'text-recalibration-700'
                    }`}
                  >
                    {selectedAnomaly.suggestion}
                  </p>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-primary-700 mb-2">
                    关联样本 ({selectedAnomaly.affectedSamples.length})
                  </h5>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedAnomaly.affectedSamples.map((sampleId) => {
                      const sample = samples.find((s) => s.id === sampleId);
                      return (
                        <div
                          key={sampleId}
                          className="text-xs bg-white border border-neutral-200 p-2 rounded flex items-center justify-between"
                        >
                          <span className="font-mono text-primary-700">
                            {sample?.barcode || sampleId}
                          </span>
                          <span className="text-neutral-500">
                            {sample?.sampleType || '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200 space-y-2 text-xs text-neutral-500">
                  <div className="flex justify-between">
                    <span>创建时间</span>
                    <span>{formatDateTime(selectedAnomaly.createdAt)}</span>
                  </div>
                  {selectedAnomaly.resolvedAt && (
                    <div className="flex justify-between">
                      <span>解决时间</span>
                      <span>{formatDateTime(selectedAnomaly.resolvedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  {selectedAnomaly.status === 'pending' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        updateAnomalyStatus(selectedAnomaly.id, 'processing')
                      }
                    >
                      开始处理
                    </Button>
                  )}
                  {selectedAnomaly.status === 'processing' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        updateAnomalyStatus(selectedAnomaly.id, 'pending')
                      }
                    >
                      退回待处理
                    </Button>
                  )}
                  {selectedAnomaly.status !== 'resolved' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        updateAnomalyStatus(selectedAnomaly.id, 'resolved')
                      }
                    >
                      标记已解决
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card title="异常详情">
              <div className="text-center py-12 text-neutral-400">
                <Info className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">选择左侧异常查看详情</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
