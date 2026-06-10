import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import {
  Mouse,
  FileText,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Plus,
  Activity,
  FlaskConical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '@/utils/common';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    samples,
    cages,
    anomalies,
    qcResults,
    currentRunBatch,
    reagentBatches,
    runBatches,
    initMockData,
  } = useAppStore();

  const supplementAnomalies = anomalies.filter((a) => a.category === 'supplement');
  const recalibrationAnomalies = anomalies.filter((a) => a.category === 'recalibration');
  const pendingAnomalies = anomalies.filter((a) => a.status === 'pending');

  const stats = [
    {
      label: '笼位数',
      value: cages.length,
      icon: Mouse,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: '样本总数',
      value: samples.length,
      icon: FileText,
      color: 'text-medical-600',
      bg: 'bg-medical-50',
    },
    {
      label: '质控结果',
      value: qcResults.length,
      icon: Activity,
      color: 'text-success-600',
      bg: 'bg-success-50',
    },
    {
      label: '待处理异常',
      value: pendingAnomalies.length,
      icon: AlertTriangle,
      color: 'text-supplement-600',
      bg: 'bg-supplement-50',
    },
  ];

  const hasData = samples.length > 0 || cages.length > 0;

  return (
    <div className="space-y-6">
      {!hasData && (
        <Card className="bg-gradient-to-r from-medical-50 to-primary-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-800 mb-2">
                欢迎使用小鼠笼位健康台账系统
              </h3>
              <p className="text-sm text-primary-600 mb-4">
                系统检测到您还没有数据，是否加载示例数据以便快速体验？
              </p>
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={initMockData}
              >
                加载示例数据
              </Button>
            </div>
            <div className="w-32 h-32 flex items-center justify-center">
              <FlaskConical className="w-24 h-24 text-medical-300" />
            </div>
          </div>
        </Card>
      )}

      {currentRunBatch && (
        <Card
          title="当前运行批次"
          subtitle={`批次号: ${currentRunBatch.batchNumber}`}
          headerAction={
            <Button variant="outline" size="sm" onClick={() => navigate('/export')}>
              导出报告
              <ArrowRight className="w-4 h-4" />
            </Button>
          }
        >
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-neutral-50 rounded-md">
              <p className="text-2xl font-bold text-primary-800">{currentRunBatch.sampleCount}</p>
              <p className="text-xs text-neutral-500 mt-1">样本数量</p>
            </div>
            <div className="text-center p-4 bg-supplement-50 rounded-md">
              <p className="text-2xl font-bold text-supplement-700">{supplementAnomalies.length}</p>
              <p className="text-xs text-supplement-600 mt-1">需补材料</p>
            </div>
            <div className="text-center p-4 bg-recalibration-50 rounded-md">
              <p className="text-2xl font-bold text-recalibration-700">{recalibrationAnomalies.length}</p>
              <p className="text-xs text-recalibration-600 mt-1">需改口径</p>
            </div>
            <div className="text-center p-4 bg-success-50 rounded-md">
              <p className="text-2xl font-bold text-success-700">
                {currentRunBatch.sampleCount - currentRunBatch.anomalyCount}
              </p>
              <p className="text-xs text-success-600 mt-1">正常样本</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center justify-between text-sm">
            <span className="text-neutral-500">
              运行时间: {formatDateTime(currentRunBatch.runAt)}
            </span>
            <Badge variant="info">{currentRunBatch.operator}</Badge>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-md shadow-card border border-neutral-200 p-5 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-primary-800 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bg} rounded-md flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card
          title="异常分类概览"
          subtitle="按处理方向分类展示"
        >
          <div className="space-y-4">
            <div
              className="p-4 bg-supplement-50 rounded-md border border-supplement-200 cursor-pointer hover:bg-supplement-100 transition-colors"
              onClick={() => navigate('/anomalies?category=supplement')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-supplement-500 rounded-md flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-supplement-800">需补材料</h4>
                    <p className="text-xs text-supplement-600">数据缺失、信息不全</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-supplement-700">
                    {supplementAnomalies.length}
                  </p>
                  <p className="text-xs text-supplement-500">条待处理</p>
                </div>
              </div>
            </div>

            <div
              className="p-4 bg-recalibration-50 rounded-md border border-recalibration-200 cursor-pointer hover:bg-recalibration-100 transition-colors"
              onClick={() => navigate('/anomalies?category=recalibration')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-recalibration-500 rounded-md flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-recalibration-800">需改口径</h4>
                    <p className="text-xs text-recalibration-600">质控超限、方法差异</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-recalibration-700">
                    {recalibrationAnomalies.length}
                  </p>
                  <p className="text-xs text-recalibration-500">条待处理</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="快捷操作">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/calculator')}
              className="p-4 text-left bg-neutral-50 rounded-md hover:bg-primary-50 hover:border-primary-300 border border-transparent transition-all"
            >
              <Activity className="w-6 h-6 text-medical-600 mb-2" />
              <h4 className="font-medium text-primary-800 text-sm">计算工具</h4>
              <p className="text-xs text-neutral-500 mt-1">公式说明、实时计算</p>
            </button>

            <button
              onClick={() => navigate('/samples')}
              className="p-4 text-left bg-neutral-50 rounded-md hover:bg-primary-50 hover:border-primary-300 border border-transparent transition-all"
            >
              <FileText className="w-6 h-6 text-primary-600 mb-2" />
              <h4 className="font-medium text-primary-800 text-sm">样本台账</h4>
              <p className="text-xs text-neutral-500 mt-1">笼位管理、条码检测</p>
            </button>

            <button
              onClick={() => navigate('/quality-control')}
              className="p-4 text-left bg-neutral-50 rounded-md hover:bg-primary-50 hover:border-primary-300 border border-transparent transition-all"
            >
              <TrendingUp className="w-6 h-6 text-success-600 mb-2" />
              <h4 className="font-medium text-primary-800 text-sm">质控分析</h4>
              <p className="text-xs text-neutral-500 mt-1">趋势图、试剂批号</p>
            </button>

            <button
              onClick={() => navigate('/anomalies')}
              className="p-4 text-left bg-neutral-50 rounded-md hover:bg-primary-50 hover:border-primary-300 border border-transparent transition-all"
            >
              <AlertTriangle className="w-6 h-6 text-supplement-600 mb-2" />
              <h4 className="font-medium text-primary-800 text-sm">异常中心</h4>
              <p className="text-xs text-neutral-500 mt-1">分级展示、处理建议</p>
            </button>
          </div>
        </Card>
      </div>

      {runBatches.length > 0 && (
        <Card title="最近运行批次" subtitle="历史批次记录">
          <div className="space-y-2">
            {runBatches.slice(0, 5).map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-md hover:bg-primary-50 transition-colors cursor-pointer"
                onClick={() => navigate('/export')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-medical-100 rounded flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-medical-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary-800">{batch.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{batch.batchNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="default">{batch.sampleCount} 样本</Badge>
                  <Badge variant={batch.anomalyCount > 0 ? 'warning' : 'success'}>
                    {batch.anomalyCount} 异常
                  </Badge>
                  <span className="text-xs text-neutral-400">
                    {formatDateTime(batch.runAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
