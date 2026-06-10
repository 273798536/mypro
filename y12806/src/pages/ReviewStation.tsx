import { useEffect, useMemo, useState } from 'react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import {
  ScanLine,
  PlayCircle,
  ClipboardEdit,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  RefreshCw,
  GripVertical,
  Sparkles,
  ListChecks,
  X,
  Hash,
  Tag,
  Image,
  FileText,
  MapPin,
  Calendar,
  Scale,
} from 'lucide-react';
import type { Band, DiffReport } from '../../shared/types';

const steps = [
  { id: 1 as const, name: '重复运行分析', icon: PlayCircle, desc: '配置参数并重新运行分析算法，对比差异' },
  { id: 2 as const, name: '补录缺失数据', icon: ClipboardEdit, desc: '补录缺失字段与人工备注，完善元数据' },
  { id: 3 as const, name: '人工确认结果', icon: CheckCircle, desc: '逐条确认或批量批准确认结果' },
];

const algorithmVersions = ['v2.0-beta', 'v1.3', 'v1.2'];

const supplementFields = [
  { value: 'sampling_site', label: '采样地点', icon: MapPin, type: 'select' },
  { value: 'micrograph', label: '显微照片', icon: Image, type: 'text' },
  { value: 'concentration', label: '浓度', icon: Scale, type: 'number' },
  { value: 'remark', label: '备注', icon: FileText, type: 'textarea' },
  { value: 'band_position', label: '条带位置', icon: GripVertical, type: 'number' },
  { value: 'gray_value', label: '灰度值', icon: Hash, type: 'number' },
];

export default function ReviewStation() {
  const {
    reviewStep,
    bands,
    lots,
    samples,
    samplingSites,
    fetchAllData,
    triggerDiffRun,
    supplementBand,
    confirmBand,
    confirmBatchBands,
    updateFilters,
  } = useWorkbenchStore();

  useEffect(() => {
    if (bands.length === 0) {
      fetchAllData();
    }
  }, [bands.length, fetchAllData]);

  const stepStats = useMemo(() => {
    const total = bands.length;
    const needsSupplement = bands.filter((b) => b.needs_supplement || b.confirm_status !== 'confirmed').length;
    const confirmed = bands.filter((b) => b.confirm_status === 'confirmed').length;
    const pending = bands.filter((b) => b.confirm_status === 'pending').length;
    return {
      step1: { done: total > 0 ? Math.min(total, analysisRunComplete ? total : Math.floor(total * 0.3)) : 0, total },
      step2: {
        done: needsSupplement > 0 ? needsSupplement - bands.filter((b) => (b.needs_supplement || b.confirm_status !== 'confirmed') && b.confirm_status === 'pending').length : 0,
        total: needsSupplement,
      },
      step3: { done: confirmed, total: pending + confirmed },
    };
  }, [bands]);

  const currentStepInfo = steps[reviewStep - 1];
  const CurrentIcon = currentStepInfo.icon;

  const setReviewStep = (step: 1 | 2 | 3) => {
    updateFilters({ ...useWorkbenchStore.getState().filters });
    useWorkbenchStore.setState({ reviewStep: step });
  };

  // ========= 步骤1 状态 =========
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [algorithmVersion, setAlgorithmVersion] = useState('v2.0-beta');
  const [sensitivity, setSensitivity] = useState(75);
  const [threshold, setThreshold] = useState(50);
  const [runningLots, setRunningLots] = useState<Set<string>>(new Set());
  const [diffReports, setDiffReports] = useState<DiffReport[]>([]);
  const [analysisRunComplete, setAnalysisRunComplete] = useState(false);

  const toggleLot = (lotId: string) => {
    setSelectedLotIds((prev) => (prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]));
  };

  const affectedBandsCount = useMemo(() => {
    if (selectedLotIds.length === 0) return bands.length;
    const sampleIds = samples.filter((s) => selectedLotIds.includes(s.lot_id)).map((s) => s.id);
    return bands.filter((b) => sampleIds.includes(b.sample_id)).length;
  }, [selectedLotIds, samples, bands]);

  const estimatedTime = useMemo(() => {
    const baseSeconds = 1.5;
    return Math.ceil(baseSeconds * (selectedLotIds.length || 1));
  }, [selectedLotIds]);

  const handleTriggerRuns = async () => {
    const lotsToRun = selectedLotIds.length > 0 ? selectedLotIds : lots.map((l) => l.id);
    setRunningLots(new Set(lotsToRun));

    const reports: DiffReport[] = [];
    for (const lotId of lotsToRun) {
      try {
        const report = await triggerDiffRun(lotId, {
          algorithm_version: algorithmVersion,
          sensitivity,
          threshold,
        });
        reports.push(report);
      } catch (err) {
        console.error('Run failed for lot', lotId, err);
      }
      setRunningLots((prev) => {
        const next = new Set(prev);
        next.delete(lotId);
        return next;
      });
    }

    setDiffReports(reports);
    setAnalysisRunComplete(true);
    if (reports.length > 0) {
      setTimeout(() => setReviewStep(2), 800);
    }
  };

  // ========= 步骤2 状态 =========
  const [selectedSupplementBandId, setSelectedSupplementBandId] = useState<string | null>(null);
  const [supplementField, setSupplementField] = useState(supplementFields[0].value);
  const [supplementValue, setSupplementValue] = useState<string>('');
  const [anomalyNote, setAnomalyNote] = useState('');
  const [supplementing, setSupplementing] = useState(false);
  const [supplementedBands, setSupplementedBands] = useState<Set<string>>(new Set());
  const [autoSupplementing, setAutoSupplementing] = useState(false);

  const needsSupplementBands = useMemo(() => {
    return bands.filter((b) => b.needs_supplement || b.confirm_status !== 'confirmed');
  }, [bands]);

  const selectedSupplementBand = needsSupplementBands.find((b) => b.id === selectedSupplementBandId);

  const getBandSampleInfo = (band: Band) => {
    return samples.find((s) => s.id === band.sample_id);
  };

  const getMissingFieldName = (band: Band): string => {
    if (band.needs_supplement) {
      if (!band.label) return '标注结论';
      if (!band.supplement_fields) return '条带备注';
    }
    if (band.confirm_status === 'rejected') return '驳回复核';
    if (band.confirm_status === 'pending') return '待确认字段';
    return '补充元数据';
  };

  const handleSupplement = async () => {
    if (!selectedSupplementBandId) return;
    setSupplementing(true);
    try {
      await supplementBand(selectedSupplementBandId, {
        field: supplementField,
        value: supplementValue,
        anomaly_note: anomalyNote,
      });
      setSupplementedBands((prev) => new Set(prev).add(selectedSupplementBandId));
      setSupplementValue('');
      setAnomalyNote('');
    } catch (err) {
      console.error('Supplement failed:', err);
    } finally {
      setSupplementing(false);
    }
  };

  const handleAutoSupplementAll = async () => {
    setAutoSupplementing(true);
    try {
      for (const band of needsSupplementBands) {
        if (!supplementedBands.has(band.id)) {
          await supplementBand(band.id, {
            auto: true,
            remark: '系统自动补录默认值',
          });
          setSupplementedBands((prev) => new Set(prev).add(band.id));
        }
      }
    } catch (err) {
      console.error('Auto supplement failed:', err);
    } finally {
      setAutoSupplementing(false);
    }
  };

  // ========= 步骤3 状态 =========
  const [selectedBandIds, setSelectedBandIds] = useState<Set<string>>(new Set());
  const [rejectingBandId, setRejectingBandId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [recentlyConfirmed, setRecentlyConfirmed] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  const reviewBands = useMemo(() => bands, [bands]);

  const toggleBandSelect = (id: string) => {
    setSelectedBandIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    const pendingIds = reviewBands.filter((b) => b.confirm_status === 'pending').map((b) => b.id);
    setSelectedBandIds(new Set(pendingIds));
  };

  const clearSelection = () => setSelectedBandIds(new Set());

  const handleConfirm = async (bandId: string) => {
    setConfirmingIds((prev) => new Set(prev).add(bandId));
    try {
      await confirmBand(bandId, true);
      setRecentlyConfirmed((prev) => new Set(prev).add(bandId));
      setTimeout(() => setRecentlyConfirmed((prev) => {
        const next = new Set(prev);
        next.delete(bandId);
        return next;
      }), 600);
    } catch (err) {
      console.error('Confirm failed:', err);
    } finally {
      setConfirmingIds((prev) => {
        const next = new Set(prev);
        next.delete(bandId);
        return next;
      });
    }
  };

  const openReject = (bandId: string) => {
    setRejectingBandId(bandId);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectingBandId) return;
    setConfirmingIds((prev) => new Set(prev).add(rejectingBandId));
    try {
      await confirmBand(rejectingBandId, false, rejectReason);
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setConfirmingIds((prev) => {
        const next = new Set(prev);
        next.delete(rejectingBandId);
        return next;
      });
      setRejectingBandId(null);
      setRejectReason('');
    }
  };

  const handleBatchConfirm = async () => {
    if (selectedBandIds.size === 0) return;
    setBatchProcessing(true);
    try {
      await confirmBatchBands(Array.from(selectedBandIds), true);
      setSelectedBandIds(new Set());
    } catch (err) {
      console.error('Batch confirm failed:', err);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedBandIds.size === 0) return;
    setBatchProcessing(true);
    try {
      await confirmBatchBands(Array.from(selectedBandIds), false);
      setSelectedBandIds(new Set());
    } catch (err) {
      console.error('Batch reject failed:', err);
    } finally {
      setBatchProcessing(false);
    }
  };

  const confirmStats = useMemo(() => {
    const confirmed = reviewBands.filter((b) => b.confirm_status === 'confirmed').length;
    const rejected = reviewBands.filter((b) => b.confirm_status === 'rejected').length;
    const remaining = reviewBands.filter((b) => b.confirm_status === 'pending').length;
    const total = reviewBands.length;
    const rate = total > 0 ? Math.round(((confirmed + rejected) / total) * 100) : 0;
    return { confirmed, rejected, remaining, total, rate };
  }, [reviewBands]);

  const allComplete = confirmStats.remaining === 0 && confirmStats.total > 0;

  // ============== RENDER ==============

  return (
    <div className="space-y-6 animate-slideIn">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4), 0 10px 25px -5px rgba(37, 99, 235, 0.1); }
          50% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0), 0 10px 25px -5px rgba(37, 99, 235, 0.2); }
        }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        @keyframes bounce-badge {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-8px) scale(1.05); }
          60% { transform: translateY(0) scale(0.98); }
        }
        .bounce-badge { animation: bounce-badge 0.8s ease-out; }
        @keyframes slide-check {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .slide-check { animation: slide-check 0.3s ease-out forwards; }
        @keyframes flip-card {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
      `}</style>

      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-serif flex items-center gap-3">
          <ScanLine className="w-7 h-7 text-lab-confirm" />
          复核工作台
        </h1>
        <p className="text-sm text-slate-500 mt-1">三步骤复核流程 · 确保数据准确性</p>
      </div>

      {/* 三步骤进度卡 - 阶梯式 */}
      <div className="relative py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = reviewStep === step.id;
            const isDone = reviewStep > step.id;
            const stats = stepStats[`step${step.id}` as keyof typeof stepStats];
            const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

            return (
              <div
                key={step.id}
                onClick={() => setReviewStep(step.id)}
                style={{ transform: `translateY(${(idx) * -8}px)` }}
                className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  isActive
                    ? 'border-lab-700 bg-lab-700/5 pulse-glow z-10'
                    : isDone
                    ? 'border-lab-confirm/40 bg-lab-confirm/5'
                    : 'border-slate-200 bg-white/60 opacity-75 hover:opacity-100 hover:border-slate-300'
                }`}
              >
                {isDone && (
                  <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-lab-confirm text-white flex items-center justify-center shadow-lg slide-check">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold ${
                      isActive
                        ? 'bg-lab-700 text-white'
                        : isDone
                        ? 'bg-lab-confirm text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step.id}
                  </div>
                  <div>
                    <div className={`text-xs font-medium mb-0.5 ${isActive ? 'text-lab-700' : isDone ? 'text-lab-confirm' : 'text-slate-400'}`}>
                      Step {step.id}
                    </div>
                    <div className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                      <Icon className="w-4 h-4" />
                      {step.name}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{step.desc}</p>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    进度
                  </span>
                  <span className="font-mono font-medium text-slate-700">
                    {stats.done} / {stats.total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isDone ? 'bg-lab-confirm' : isActive ? 'bg-lab-700' : 'bg-slate-300'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 z-20 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center shadow-sm" style={{ transform: 'translateY(calc(-50% + ' + (idx * -8) + 'px))' }}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 步骤内容区 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-lab-700/10 flex items-center justify-center">
              <CurrentIcon className="w-5 h-5 text-lab-700" />
            </span>
            Step {reviewStep} · {currentStepInfo.name}
          </h3>
          <span className="text-xs text-slate-400">{currentStepInfo.desc}</span>
        </div>

        {/* ========= 步骤1：重复运行分析 ========= */}
        {reviewStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 左：配置表单 */}
            <div className="lg:col-span-3 space-y-5">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2.5">
                  <Tag className="w-4 h-4 text-lab-700" />
                  选择批号（多选）
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                  {lots.map((lot) => {
                    const checked = selectedLotIds.includes(lot.id) || (selectedLotIds.length === 0);
                    const isRunning = runningLots.has(lot.id);
                    return (
                      <label
                        key={lot.id}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          checked
                            ? 'border-lab-700/40 bg-lab-700/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLotIds.includes(lot.id)}
                          onChange={() => toggleLot(lot.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate flex items-center gap-1.5">
                            {lot.lot_number}
                            {isRunning && <Loader2 className="w-3 h-3 text-lab-700 animate-spin" />}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{lot.reagent_name}</div>
                        </div>
                      </label>
                    );
                  })}
                  {lots.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-xs text-slate-400">加载中...</div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2.5">
                  <Zap className="w-4 h-4 text-lab-700" />
                  算法版本
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {algorithmVersions.map((v) => (
                    <button
                      key={v}
                      onClick={() => setAlgorithmVersion(v)}
                      className={`p-2.5 rounded-lg border-2 text-sm font-mono transition-all ${
                        algorithmVersion === v
                          ? 'border-lab-700 bg-lab-700/5 text-lab-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <SlidersHorizontal className="w-4 h-4 text-lab-700" />
                      灵敏度
                    </label>
                    <span className="font-mono text-sm text-lab-700 font-bold">{sensitivity}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="w-full accent-lab-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>保守</span><span>平衡</span><span>激进</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <SlidersHorizontal className="w-4 h-4 text-lab-700" />
                      阈值
                    </label>
                    <span className="font-mono text-sm text-lab-700 font-bold">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-lab-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>宽松</span><span>适中</span><span>严格</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-lab-warn shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  新一轮运行将与最近一轮自动对比差异，检测到的变化会显示在差异报告中。运行不覆盖原数据，仅新增一轮分析记录。
                </p>
              </div>

              <button
                onClick={handleTriggerRuns}
                disabled={runningLots.size > 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-lab-700 to-blue-600 text-white font-semibold hover:from-lab-800 hover:to-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-lab-700/20"
              >
                {runningLots.size > 0 ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在分析 {runningLots.size} 个批号...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    触发重复运行
                  </>
                )}
              </button>
            </div>

            {/* 右：预览信息 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  受影响条带
                </div>
                <div className="text-4xl font-bold font-mono text-slate-800">{affectedBandsCount}</div>
                <div className="text-xs text-slate-400 mt-1">条记录将参与对比分析</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                <div className="text-xs text-amber-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  预计运行时间
                </div>
                <div className="text-4xl font-bold font-mono text-amber-800">
                  ~{estimatedTime}<span className="text-xl ml-1">秒</span>
                </div>
                <div className="text-xs text-amber-600/70 mt-1">基于算法复杂度估算</div>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-white">
                <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-lab-supplement" />
                  当前配置
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">算法版本</span>
                    <span className="font-mono text-slate-700">{algorithmVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">灵敏度</span>
                    <span className="font-mono text-slate-700">{sensitivity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">阈值</span>
                    <span className="font-mono text-slate-700">{threshold}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">批号范围</span>
                    <span className="font-mono text-slate-700">{selectedLotIds.length > 0 ? selectedLotIds.length : lots.length} 个</span>
                  </div>
                </div>
              </div>

              {/* 差异报告徽章 */}
              {diffReports.length > 0 && (
                <div className="bounce-badge rounded-xl border-2 border-lab-confirm/30 bg-gradient-to-br from-emerald-50 to-green-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-lab-confirm" />
                    <span className="text-sm font-bold text-lab-confirm">差异分析完成</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500">分析批号</div>
                      <div className="text-2xl font-bold font-mono text-slate-800">{diffReports.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">差异总数</div>
                      <div className="text-2xl font-bold font-mono text-lab-700">
                        {diffReports.reduce((s, r) => s + r.total_changed, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========= 步骤2：补录缺失数据 ========= */}
        {reviewStep === 2 && (
          <div className="space-y-4">
            {/* 顶部筛选条 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/60 border border-purple-100">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-lab-supplement" />
                <span className="text-slate-700">只显示需要补录的数据：</span>
                <span className="px-2 py-0.5 rounded bg-lab-supplement/10 text-lab-supplement text-xs font-medium">
                  needs_supplement = true 或 confirm_status != confirmed
                </span>
              </div>
              <span className="text-xs font-mono text-lab-supplement font-bold">
                共 {needsSupplementBands.length} 条待处理
              </span>
            </div>

            {needsSupplementBands.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-lab-confirm" />
                </div>
                <div className="text-lg font-semibold text-slate-700 mb-1">✅ 所有数据完整</div>
                <div className="text-sm text-slate-500">无需补录，可直接进入确认步骤</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* 左侧：清单 */}
                <div className="lg:col-span-3 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                    <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />
                      待补录清单 ({needsSupplementBands.length})
                    </div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                    {needsSupplementBands.map((band) => {
                      const sample = getBandSampleInfo(band);
                      const missingField = getMissingFieldName(band);
                      const isSelected = selectedSupplementBandId === band.id;
                      const isDone = supplementedBands.has(band.id);
                      return (
                        <div
                          key={band.id}
                          onClick={() => setSelectedSupplementBandId(band.id)}
                          className={`p-3.5 cursor-pointer transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-lab-700/5 border-l-4 border-l-lab-700'
                              : isDone
                              ? 'bg-emerald-50/50 hover:bg-emerald-50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            isDone ? 'bg-lab-confirm text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isDone ? <CheckCircle2 className="w-4 h-4 slide-check" /> : <GripVertical className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono text-sm text-slate-800 font-medium">
                                {sample?.sample_code ?? '未知样本'}
                              </span>
                              {isDone && (
                                <span className="px-1.5 py-0.5 rounded bg-lab-confirm/10 text-lab-confirm text-[10px] font-medium slide-check">
                                  已补录
                                </span>
                              )}
                              {band.confirm_status === 'rejected' && (
                                <span className="px-1.5 py-0.5 rounded bg-lab-danger/10 text-lab-danger text-[10px] font-medium">
                                  驳回复核
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100">{missingField}</span>
                              <span className="text-lab-danger">当前值缺失 / 未确认</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSupplementBandId(band.id);
                            }}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isDone
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-lab-supplement text-white hover:bg-lab-supplement/90'
                            }`}
                          >
                            {isDone ? '查看' : '补录'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 右侧：补录表单 */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 overflow-hidden bg-gradient-to-br from-white to-purple-50/30">
                  <div className="bg-gradient-to-r from-purple-50 to-white px-4 py-2.5 border-b border-slate-200">
                    <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <ClipboardEdit className="w-3.5 h-3.5 text-lab-supplement" />
                      补录表单
                    </div>
                  </div>
                  {!selectedSupplementBand ? (
                    <div className="p-10 text-center text-sm text-slate-400">
                      <GripVertical className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      点击左侧清单选择要补录的条目
                    </div>
                  ) : (
                    <div className="p-5 space-y-4">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">当前条目</div>
                        <div className="font-mono text-sm font-bold text-slate-800">
                          {getBandSampleInfo(selectedSupplementBand)?.sample_code ?? '-'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          条带位置 {selectedSupplementBand.position_mm}mm · {selectedSupplementBand.molecular_weight_kda}kDa
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">补录字段</label>
                        <select
                          value={supplementField}
                          onChange={(e) => setSupplementField(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-lab-supplement"
                        >
                          {supplementFields.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          {supplementFields.find((f) => f.value === supplementField)?.label}值
                        </label>
                        {supplementField === 'sampling_site' ? (
                          <select
                            value={supplementValue}
                            onChange={(e) => setSupplementValue(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-lab-supplement"
                          >
                            <option value="">选择采样地点</option>
                            {samplingSites.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        ) : supplementField === 'remark' ? (
                          <textarea
                            value={supplementValue}
                            onChange={(e) => setSupplementValue(e.target.value)}
                            rows={3}
                            placeholder="输入备注内容..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-lab-supplement resize-none"
                          />
                        ) : supplementField === 'concentration' || supplementField === 'band_position' || supplementField === 'gray_value' ? (
                          <input
                            type="number"
                            value={supplementValue}
                            onChange={(e) => setSupplementValue(e.target.value)}
                            placeholder="输入数值..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-lab-supplement font-mono"
                          />
                        ) : (
                          <input
                            type="text"
                            value={supplementValue}
                            onChange={(e) => setSupplementValue(e.target.value)}
                            placeholder="输入内容..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-lab-supplement"
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">异常说明（可选）</label>
                        <textarea
                          value={anomalyNote}
                          onChange={(e) => setAnomalyNote(e.target.value)}
                          rows={2}
                          placeholder="描述异常情况、补录原因等..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-lab-supplement resize-none"
                        />
                      </div>

                      <button
                        onClick={handleSupplement}
                        disabled={supplementing || !supplementValue}
                        className="w-full py-2.5 rounded-lg bg-lab-supplement text-white text-sm font-medium hover:bg-lab-supplement/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {supplementing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />提交中...</>
                        ) : (
                          <>提交补录</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleAutoSupplementAll}
                disabled={autoSupplementing || needsSupplementBands.length === 0}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {autoSupplementing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                全部自动补录（用默认值）
              </button>
              <button
                onClick={() => setReviewStep(3)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-lab-700 to-blue-600 text-white text-sm font-medium hover:from-lab-800 hover:to-blue-700 transition-all shadow-sm flex items-center gap-1.5"
              >
                跳过补录，直接确认
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========= 步骤3：人工确认 ========= */}
        {reviewStep === 3 && (
          <div className="space-y-4">
            {/* 完成横幅 */}
            {allComplete && (
              <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white p-5 shadow-lg shadow-emerald-500/20 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <div className="text-lg font-bold">本批次复核完成</div>
                    <div className="text-sm text-emerald-50/90">所有数据已确认或驳回，可导出结果</div>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-sm font-medium transition-colors">
                  前往导出 →
                </button>
              </div>
            )}

            {/* 顶部批量操作 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={selectAllPending}
                  className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  全选待确认
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  清空选择
                </button>
                <span className="text-xs text-slate-500 mx-1">
                  已选 <span className="font-mono font-bold text-slate-700">{selectedBandIds.size}</span> 条
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchConfirm}
                  disabled={selectedBandIds.size === 0 || batchProcessing}
                  className="px-4 py-1.5 rounded-md bg-lab-confirm text-white text-xs font-medium hover:bg-lab-confirm/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {batchProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  批量确认
                </button>
                <button
                  onClick={handleBatchReject}
                  disabled={selectedBandIds.size === 0 || batchProcessing}
                  className="px-4 py-1.5 rounded-md bg-lab-danger text-white text-xs font-medium hover:bg-lab-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {batchProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  批量驳回
                </button>
              </div>
            </div>

            {/* 表格 */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto max-h-[440px] custom-scrollbar">
                <table className="w-full text-sm table-zebra">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-600 text-xs uppercase tracking-wide">
                      <th className="px-3 py-3 w-10"></th>
                      <th className="px-3 py-3 text-left font-medium">样本编号</th>
                      <th className="px-3 py-3 text-left font-medium">条带详情</th>
                      <th className="px-3 py-3 text-left font-medium">标注结论</th>
                      <th className="px-3 py-3 text-left font-medium">分类</th>
                      <th className="px-3 py-3 text-left font-medium">复核状态</th>
                      <th className="px-3 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewBands.map((band) => {
                      const sample = getBandSampleInfo(band);
                      const isSelected = selectedBandIds.has(band.id);
                      const isConfirming = confirmingIds.has(band.id);
                      const wasConfirmed = recentlyConfirmed.has(band.id);
                      const isPending = band.confirm_status === 'pending';
                      return (
                        <tr
                          key={band.id}
                          style={{
                            backgroundColor: wasConfirmed ? 'rgba(16, 185, 129, 0.15)' : undefined,
                            transition: 'background-color 300ms ease-out',
                          }}
                          className="group relative"
                        >
                          <td className="px-3 py-3 relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBandSelect(band.id)}
                              className="rounded"
                            />
                            {wasConfirmed && (
                              <CheckCircle2 className="w-5 h-5 text-lab-confirm absolute left-1 top-1/2 -translate-y-1/2 slide-check" />
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-700 font-medium">
                            {sample?.sample_code ?? '-'}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            <div className="text-xs space-y-0.5">
                              <div>位置：<span className="font-mono text-slate-800">{band.position_mm}mm</span></div>
                              <div>分子量：<span className="font-mono text-slate-800">{band.molecular_weight_kda}kDa</span></div>
                              <div className="flex items-center gap-1">
                                质量分：
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${band.quality_score}%`,
                                      backgroundColor: band.quality_score >= 70 ? '#059669' : band.quality_score >= 40 ? '#d97706' : '#dc2626',
                                    }}
                                  />
                                </div>
                                <span className="font-mono text-slate-800">{band.quality_score}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {band.label ?? <span className="text-slate-400 italic">未标注</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              band.label_category === 'target' ? 'bg-blue-100 text-blue-700'
                              : band.label_category === 'nonspecific' ? 'bg-amber-100 text-amber-700'
                              : band.label_category === 'smear' ? 'bg-purple-100 text-purple-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                              {band.label_category === 'target' ? '目标条带'
                              : band.label_category === 'nonspecific' ? '非特异性'
                              : band.label_category === 'smear' ? '拖尾'
                              : '缺失'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`flex items-center gap-1 text-xs font-medium ${
                              band.confirm_status === 'confirmed' ? 'text-lab-confirm'
                              : band.confirm_status === 'rejected' ? 'text-lab-danger'
                              : 'text-lab-warn'
                            }`}>
                              {band.confirm_status === 'confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {band.confirm_status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                              {band.confirm_status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                              {band.confirm_status === 'confirmed' ? '已确认'
                              : band.confirm_status === 'rejected' ? '已驳回'
                              : '待确认'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className={`flex items-center justify-end gap-1.5 transition-opacity ${
                              isPending ? 'opacity-0 group-hover:opacity-100' : ''
                            }`}>
                              <button
                                onClick={() => handleConfirm(band.id)}
                                disabled={isConfirming || !isPending}
                                className={`p-1.5 rounded-md transition-all ${
                                  isPending
                                    ? 'bg-lab-confirm text-white hover:bg-lab-confirm/90 shadow-sm'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                                title="确认"
                              >
                                {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => openReject(band.id)}
                                disabled={isConfirming || !isPending}
                                className={`p-1.5 rounded-md transition-all ${
                                  isPending
                                    ? 'bg-lab-danger text-white hover:bg-lab-danger/90 shadow-sm'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                                title="驳回"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 底部摘要 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500 mb-0.5">总数</div>
                <div className="text-2xl font-bold font-mono text-slate-800">{confirmStats.total}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="text-xs text-emerald-700 mb-0.5">已确认</div>
                <div className="text-2xl font-bold font-mono text-lab-confirm">{confirmStats.confirmed}</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                <div className="text-xs text-red-700 mb-0.5">已驳回</div>
                <div className="text-2xl font-bold font-mono text-lab-danger">{confirmStats.rejected}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <div className="text-xs text-amber-700 mb-0.5">剩余</div>
                <div className="text-2xl font-bold font-mono text-lab-warn">{confirmStats.remaining}</div>
              </div>
              <div className="rounded-lg border border-lab-700/30 bg-gradient-to-br from-blue-50 to-lab-700/5 p-3">
                <div className="text-xs text-lab-700 mb-0.5">完成率</div>
                <div className="flex items-end gap-1">
                  <div className="text-2xl font-bold font-mono text-lab-700">{confirmStats.rate}</div>
                  <div className="text-xs text-lab-700 pb-1">%</div>
                </div>
                <div className="h-1.5 mt-1.5 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full bg-lab-700 rounded-full transition-all duration-500"
                    style={{ width: `${confirmStats.rate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 驳回弹窗 */}
      {rejectingBandId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-slideIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-lab-danger" />
                驳回确认
              </h3>
              <button
                onClick={() => setRejectingBandId(null)}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">请输入驳回原因，将记录到复核日志中：</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="例如：条带位置偏差过大，需重新检测..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-lab-danger resize-none"
                autoFocus
              />
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setRejectingBandId(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 rounded-lg bg-lab-danger text-white text-sm font-medium hover:bg-lab-danger/90 transition-colors disabled:opacity-50"
              >
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
