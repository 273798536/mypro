import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  FilePlus,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  Play,
  Save,
  X,
  Search,
  Filter,
  AlertOctagon,
  CheckCheck,
  FileText,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AnomalyStatus } from '@/types';

const statusFilters: { value: AnomalyStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'detected', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
];

const stepInfo = [
  {
    step: 1,
    name: 'rerun',
    title: '重复运行',
    description: '重新进行AI估算，确认结果一致性',
    icon: RefreshCw,
  },
  {
    step: 2,
    name: 'supplement',
    title: '补录信息',
    description: '补充病理备注、测序数据等信息',
    icon: FilePlus,
  },
  {
    step: 3,
    name: 'confirm',
    title: '人工确认',
    description: '检验师人工审核并确认最终结论',
    icon: UserCheck,
  },
];

export default function Anomalies() {
  const { barcode } = useParams<{ barcode?: string }>();
  const navigate = useNavigate();
  const anomalies = useAppStore((state) => state.anomalies);
  const samples = useAppStore((state) => state.samples);
  const getSampleById = useAppStore((state) => state.getSampleById);
  const completeAnomalyStep = useAppStore((state) => state.completeAnomalyStep);
  const resolveAnomaly = useAppStore((state) => state.resolveAnomaly);

  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarcode, setSelectedBarcode] = useState(barcode || '');
  const [showStepModal, setShowStepModal] = useState<number | null>(null);
  const [stepResult, setStepResult] = useState('');
  const [finalConclusion, setFinalConclusion] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  const filteredAnomalies = anomalies.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery && !a.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const currentAnomaly = selectedBarcode
    ? anomalies.find((a) => a.barcode === selectedBarcode)
    : null;

  const relatedSamples = currentAnomaly
    ? currentAnomaly.sampleIds.map((id) => getSampleById(id)).filter(Boolean)
    : [];

  const getCompletedSteps = () => {
    if (!currentAnomaly) return 0;
    return currentAnomaly.steps.filter((s) => s.status === 'completed').length;
  };

  const handleCompleteStep = (stepNumber: 1 | 2 | 3) => {
    if (!currentAnomaly) return;
    completeAnomalyStep(currentAnomaly.id, stepNumber, stepResult, '李检验师');
    setShowStepModal(null);
    setStepResult('');
  };

  const handleResolve = () => {
    if (!currentAnomaly) return;
    resolveAnomaly(currentAnomaly.id, finalConclusion, '李检验师');
    setShowResolveModal(false);
    setFinalConclusion('');
  };

  const getStatusBadge = (status: AnomalyStatus) => {
    switch (status) {
      case 'detected':
        return 'badge-danger';
      case 'processing':
        return 'badge-warning';
      case 'resolved':
        return 'badge-success';
      default:
        return 'badge-default';
    }
  };

  const getStatusLabel = (status: AnomalyStatus) => {
    switch (status) {
      case 'detected':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'resolved':
        return '已解决';
      default:
        return status;
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedBarcode && (
              <button
                onClick={() => setSelectedBarcode('')}
                className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                异常处理中心
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                规范处理条码重复等异常数据，三步流程确保结果准确
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-50 rounded-lg border border-warning-200">
              <AlertTriangle className="w-4 h-4 text-warning-600" />
              <span className="text-sm font-medium text-warning-700">
                {anomalies.filter((a) => a.status !== 'resolved').length} 条待处理
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!selectedBarcode ? (
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
            <div className="card p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索条码..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-9"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                        statusFilter === filter.value
                          ? 'bg-brand-100 text-brand-700'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredAnomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="card p-5 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => setSelectedBarcode(anomaly.barcode)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            anomaly.status === 'resolved'
                              ? 'bg-accent-100'
                              : anomaly.status === 'processing'
                              ? 'bg-warning-100'
                              : 'bg-danger-100'
                          )}
                        >
                          {anomaly.status === 'resolved' ? (
                            <CheckCircle2 className="w-5 h-5 text-accent-600" />
                          ) : anomaly.status === 'processing' ? (
                            <Clock className="w-5 h-5 text-warning-600" />
                          ) : (
                            <AlertOctagon className="w-5 h-5 text-danger-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-semibold text-slate-900">
                              {anomaly.barcode}
                            </span>
                            <span className={`badge ${getStatusBadge(anomaly.status)}`}>
                              {getStatusLabel(anomaly.status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">
                            条码重复 · 涉及 {anomaly.sampleIds.length} 个样本
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        发现于{' '}
                        {formatDistanceToNow(new Date(anomaly.detectedAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-slate-500">
                            处理进度
                          </span>
                          <span className="text-xs font-medium text-slate-700">
                            {anomaly.steps.filter((s) => s.status === 'completed').length}/3
                            步
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              anomaly.status === 'resolved'
                                ? 'bg-accent-500'
                                : 'bg-warning-500'
                            )}
                            style={{
                              width: `${(anomaly.steps.filter((s) => s.status === 'completed').length / 3) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      {stepInfo.map((step) => {
                        const stepData = anomaly.steps.find(
                          (s) => s.stepNumber === step.step
                        );
                        const isCompleted = stepData?.status === 'completed';
                        const isInProgress = stepData?.status === 'in_progress';
                        const Icon = step.icon;
                        return (
                          <div
                            key={step.step}
                            className="flex items-center gap-1.5"
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center',
                                isCompleted
                                  ? 'bg-accent-100'
                                  : isInProgress
                                  ? 'bg-warning-100 animate-pulse'
                                  : 'bg-slate-100'
                              )}
                            >
                              {isCompleted ? (
                                <CheckCheck className="w-3 h-3 text-accent-600" />
                              ) : (
                                <Icon
                                  className={cn(
                                    'w-3 h-3',
                                    isInProgress
                                      ? 'text-warning-600'
                                      : 'text-slate-400'
                                  )}
                                />
                              )}
                            </div>
                            <span
                              className={cn(
                                'text-xs',
                                isCompleted
                                  ? 'text-accent-700'
                                  : isInProgress
                                  ? 'text-warning-700'
                                  : 'text-slate-400'
                              )}
                            >
                              {step.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAnomalies.length === 0 && (
              <div className="card p-12 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-accent-300 mb-4" />
                <p className="text-slate-500">暂无符合条件的异常记录</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-slate-50">
            {currentAnomaly && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="card p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-serif font-bold text-slate-900">
                          {currentAnomaly.barcode}
                        </h2>
                        <span
                          className={`badge ${getStatusBadge(currentAnomaly.status)}`}
                        >
                          {getStatusLabel(currentAnomaly.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        条码重复异常 · 发现于{' '}
                        {format(new Date(currentAnomaly.detectedAt), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                    {getCompletedSteps() === 3 &&
                      currentAnomaly.status !== 'resolved' && (
                        <button
                          onClick={() => setShowResolveModal(true)}
                          className="btn-accent"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          标记为已解决
                        </button>
                      )}
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                      涉及样本 ({relatedSamples.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {relatedSamples.map((sample, idx) =>
                        sample ? (
                          <div
                            key={sample.id}
                            className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-brand-300 transition-colors"
                            onClick={() => navigate(`/samples/${sample.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm text-slate-800">
                                样本 {idx + 1}
                              </span>
                              <span className="text-xs text-slate-500">
                                {sample.patientInfo.tissueType}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-2">
                              {sample.patientInfo.diagnosis}
                            </p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-lg font-serif font-bold text-slate-800">
                                {sample.latestPositiveRate?.toFixed(1) || '-'}%
                              </span>
                              <span className="text-xs text-slate-500">
                                v{sample.currentVersion}
                              </span>
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-6">
                    三步处理流程
                  </h3>

                  <div className="relative">
                    <div className="absolute top-6 left-1/2 right-6 h-0.5 bg-slate-200" />
                    <div className="absolute top-6 left-1/2 h-0.5 bg-slate-200" />

                    <div className="grid grid-cols-3 gap-6 relative">
                      {stepInfo.map((step) => {
                        const stepData = currentAnomaly.steps.find(
                          (s) => s.stepNumber === step.step
                        );
                        const isCompleted = stepData?.status === 'completed';
                        const isInProgress = stepData?.status === 'in_progress';
                        const isPending = stepData?.status === 'pending';
                        const canStart =
                          step.step === 1 ||
                          currentAnomaly.steps
                            .find((s) => s.stepNumber === (step.step - 1 as 1 | 2))
                            ?.status === 'completed';
                        const Icon = step.icon;

                        return (
                          <div key={step.step} className="relative">
                            <div
                              className={cn(
                                'mx-auto w-12 h-12 rounded-full flex items-center justify-center shadow-md z-10 relative',
                                isCompleted
                                  ? 'bg-accent-500 text-white'
                                  : isInProgress
                                  ? 'bg-warning-500 text-white'
                                  : 'bg-white text-slate-400 border-2 border-slate-200'
                              )}
                            >
                              {isCompleted ? (
                                <CheckCheck className="w-6 h-6" />
                              ) : (
                                <Icon className="w-6 h-6" />
                              )}
                            </div>

                            <div className="mt-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  步骤 {step.step}
                                </span>
                                <span
                                  className={cn(
                                    'text-xs px-2 py-0.5 rounded-full',
                                    isCompleted
                                      ? 'bg-accent-100 text-accent-700'
                                      : isInProgress
                                      ? 'bg-warning-100 text-warning-700'
                                      : 'bg-slate-100 text-slate-600'
                                  )}
                                >
                                  {isCompleted
                                    ? '已完成'
                                    : isInProgress
                                    ? '进行中'
                                    : '待处理'}
                                </span>
                              </div>
                              <h4 className="text-base font-medium text-slate-800 mt-1">
                                {step.title}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {step.description}
                              </p>

                              {stepData?.completedAt && (
                                <p className="text-xs text-slate-400 mt-2">
                                  完成于{' '}
                                  {format(
                                    new Date(stepData.completedAt),
                                    'MM-dd HH:mm'
                                  )}
                                </p>
                              )}
                              {stepData?.operator && (
                                <p className="text-xs text-slate-400">
                                  操作人：{stepData.operator}
                                </p>
                              )}

                              {canStart && !isCompleted && (
                                <button
                                  onClick={() => {
                                    setShowStepModal(step.step);
                                    setStepResult(stepData?.result || '');
                                  }}
                                  className={cn(
                                    'mt-4 w-full btn-sm',
                                    isInProgress ? 'btn-warning' : 'btn-primary'
                                  )}
                                >
                                  {isInProgress ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                      处理中...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3.5 h-3.5 mr-1.5" />
                                      开始处理
                                    </>
                                  )}
                                </button>
                              )}

                              {!canStart && (
                                <p className="mt-4 text-xs text-slate-400">
                                  请先完成上一步
                                </p>
                              )}
                            </div>

                            {stepData?.result && isCompleted && (
                              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">
                                  处理结果
                                </p>
                                <p className="text-sm text-slate-700">
                                  {stepData.result}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {currentAnomaly.finalConclusion && (
                  <div className="card p-6 bg-gradient-to-r from-accent-50 to-white border-accent-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-accent-600" />
                      <h3 className="text-base font-semibold text-slate-900">
                        最终结论
                      </h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {currentAnomaly.finalConclusion}
                    </p>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-accent-200">
                      <span className="text-xs text-accent-600">
                        确认人：{currentAnomaly.resolvedBy}
                      </span>
                      <span className="text-xs text-accent-600">
                        确认时间：
                        {currentAnomaly.resolvedAt &&
                          format(new Date(currentAnomaly.resolvedAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="card p-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-4">
                    处理记录
                  </h3>
                  <div className="space-y-3">
                    {currentAnomaly.steps
                      .filter((s) => s.status === 'completed')
                      .map((step) => {
                        const info = stepInfo.find(
                          (i) => i.step === step.stepNumber
                        );
                        const Icon = info?.icon || FileText;
                        return (
                          <div
                            key={step.id}
                            className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                          >
                            <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-accent-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-800">
                                  步骤 {step.stepNumber}：{info?.title}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {step.completedAt &&
                                    format(
                                      new Date(step.completedAt),
                                      'HH:mm:ss'
                                    )}
                                </span>
                              </div>
                              {step.result && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {step.result}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                操作人：{step.operator}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showStepModal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg mx-4 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">
                步骤 {showStepModal}：{stepInfo[showStepModal - 1]?.title}
              </h3>
              <button
                onClick={() => {
                  setShowStepModal(null);
                  setStepResult('');
                }}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-brand-50 rounded-lg border border-brand-100">
                <p className="text-sm text-brand-700">
                  {stepInfo[showStepModal - 1]?.description}
                </p>
              </div>

              <div>
                <label className="label">
                  {showStepModal === 1
                    ? '重新估算结果说明'
                    : showStepModal === 2
                    ? '补充的信息内容'
                    : '人工确认意见'}
                </label>
                <textarea
                  value={stepResult}
                  onChange={(e) => setStepResult(e.target.value)}
                  className="textarea h-32"
                  placeholder={
                    showStepModal === 1
                      ? '请描述重新估算的结果和差异...'
                      : showStepModal === 2
                      ? '请补充病理备注、测序数据等信息...'
                      : '请输入人工确认的结论和依据...'
                  }
                />
              </div>

              {showStepModal === 1 && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">
                    提示：系统将自动重新运行AI估算
                  </p>
                  <button
                    onClick={() => {
                      setStepResult(
                        '重新运行AI估算完成，结果与首次估算差异在可接受范围内（±3%），确认数据有效。'
                      );
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    + 使用模拟结果填充
                  </button>
                </div>
              )}

              {showStepModal === 2 && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setStepResult(
                        '已补充：\n1. 病理备注：确认两标本为同一患者不同部位取材\n2. 测序结果：补充EGFR突变检测数据\n3. 临床信息：患者曾接受新辅助化疗'
                      );
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    + 使用模拟补录内容填充
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowStepModal(null);
                  setStepResult('');
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={() => handleCompleteStep(showStepModal as 1 | 2 | 3)}
                className="btn-primary"
                disabled={!stepResult.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                完成此步
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg mx-4 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">
                确认异常已解决
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning-800">
                      请确认三步流程均已完成
                    </p>
                    <p className="text-xs text-warning-600 mt-1">
                      重复运行、补录信息、人工确认三步缺一不可
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">最终结论</label>
                <textarea
                  value={finalConclusion}
                  onChange={(e) => setFinalConclusion(e.target.value)}
                  className="textarea h-28"
                  placeholder="请输入此异常的最终结论..."
                />
              </div>

              <button
                onClick={() => {
                  setFinalConclusion(
                    '经三步核查：两标本确认为同一患者不同时间送检，条码重复为系统录入错误所致。已分别标注区分，阳性率结果均有效，不影响临床判断。建议加强条码录入校验。'
                  );
                }}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                + 使用模板结论填充
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowResolveModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                className="btn-accent"
                disabled={!finalConclusion.trim()}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                确认解决
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
