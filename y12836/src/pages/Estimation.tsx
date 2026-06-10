import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Settings2,
  Zap,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  X,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PositiveRateRing from '@/components/charts/PositiveRateRing';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Estimation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const samples = useAppStore((state) => state.samples);
  const getSampleById = useAppStore((state) => state.getSampleById);
  const getSampleVersions = useAppStore((state) => state.getSampleVersions);
  const runEstimation = useAppStore((state) => state.runEstimation);
  const addCorrection = useAppStore((state) => state.addCorrection);

  const sample = id ? getSampleById(id) : samples.find((s) => s.status === 'pending' || s.status === 'estimated');
  const versions = sample ? getSampleVersions(sample.id) : [];
  const latestVersion = versions[0];

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('IHC-AI-Pro v2.1.0');
  const [threshold, setThreshold] = useState('moderate');
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedRate, setCorrectedRate] = useState(0);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');

  const handleRunEstimation = async () => {
    if (!sample) return;

    setIsRunning(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    await runEstimation(sample.id);

    clearInterval(interval);
    setProgress(100);
    setTimeout(() => {
      setIsRunning(false);
      setProgress(0);
    }, 500);
  };

  const handleSaveCorrection = () => {
    if (!sample || !latestVersion) return;
    addCorrection(
      sample.id,
      latestVersion.id,
      correctedRate,
      correctionReason,
      correctionNote,
      '李检验师'
    );
    setShowCorrection(false);
    setCorrectionReason('');
    setCorrectionNote('');
  };

  if (!sample) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>请选择一个样本进行AI估算</p>
          <button
            onClick={() => navigate('/samples')}
            className="btn-primary mt-4"
          >
            前往样本列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(id ? `/samples/${id}` : '/samples')}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-serif font-bold text-slate-900">
                  AI阳性率估算
                </h1>
                <StatusBadge status={sample.status} />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                样本条码：<span className="font-mono">{sample.barcode}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning && (
              <button
                onClick={handleRunEstimation}
                className="btn-accent"
                disabled={isRunning}
              >
                <Play className="w-4 h-4 mr-2" />
                {sample.currentVersion > 0 ? '重新估算' : '开始估算'}
              </button>
            )}
            {isRunning && (
              <button className="btn-accent opacity-80 cursor-wait">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                估算中...
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-slate-50">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {isRunning && (
              <div className="card p-6 bg-gradient-to-r from-brand-50 to-accent-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                      <Zap className="w-5 h-5 text-brand-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">正在进行AI分析</h3>
                      <p className="text-sm text-slate-600">
                        图像识别与阳性细胞计数中...
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-serif font-bold text-brand-700">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                  <span>细胞检测</span>
                  <span>阳性识别</span>
                  <span>结果计算</span>
                  <span>报告生成</span>
                </div>
              </div>
            )}

            {latestVersion && !isRunning && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      估算结果
                    </h2>
                    <p className="text-sm text-slate-500">
                      版本 v{latestVersion.version} ·{' '}
                      {format(new Date(latestVersion.estimatedAt), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCorrectedRate(latestVersion.positiveRate);
                        setShowCorrection(true);
                      }}
                      className="btn-secondary btn-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      人工修正
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-1 flex justify-center">
                    <PositiveRateRing
                      rate={latestVersion.positiveRate}
                      size={160}
                      strokeWidth={14}
                      label="阳性率"
                    />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">细胞总数</p>
                        <p className="text-xl font-serif font-bold text-slate-800">
                          {latestVersion.cellCount?.toLocaleString() || '-'}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">阳性细胞数</p>
                        <p className="text-xl font-serif font-bold text-accent-600">
                          {latestVersion.positiveCellCount?.toLocaleString() || '-'}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">组织面积</p>
                        <p className="text-xl font-serif font-bold text-slate-800">
                          {latestVersion.tissueArea || '-'} mm²
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">染色强度</p>
                        <p className="text-xl font-serif font-bold text-slate-800">
                          {latestVersion.stainingIntensity === 'strong'
                            ? '强 +++'
                            : latestVersion.stainingIntensity === 'moderate'
                            ? '中 ++'
                            : '弱 +'}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-brand-50 rounded-lg border border-brand-100">
                      <p className="text-xs text-brand-600 mb-1">置信区间</p>
                      <p className="text-lg font-serif font-bold text-brand-800">
                        {latestVersion.confidenceInterval[0].toFixed(1)}% ~{' '}
                        {latestVersion.confidenceInterval[1].toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-medium text-slate-900 mb-2">
                    结论
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {latestVersion.conclusion}
                  </p>
                  {latestVersion.processingOpinion && (
                    <div className="mt-3 p-3 bg-accent-50 rounded-lg">
                      <p className="text-xs text-accent-600 mb-1">处理意见</p>
                      <p className="text-sm text-accent-800">
                        {latestVersion.processingOpinion}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!latestVersion && !isRunning && (
              <div className="card p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <Activity className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  尚未进行AI估算
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  点击右上角"开始估算"按钮，系统将自动分析免疫组化图像，
                  计算阳性细胞比例并生成初步结论。
                </p>
                <button
                  onClick={handleRunEstimation}
                  className="btn-accent btn-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  开始AI估算
                </button>
              </div>
            )}

            {showCorrection && latestVersion && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="card p-6 w-full max-w-lg mx-4 animate-slide-up">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      人工修正
                    </h3>
                    <button
                      onClick={() => setShowCorrection(false)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">AI原始结果</span>
                        <span className="text-lg font-serif font-bold text-slate-800">
                          {latestVersion.positiveRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="label">修正后阳性率 (%)</label>
                      <input
                        type="number"
                        value={correctedRate}
                        onChange={(e) => setCorrectedRate(parseFloat(e.target.value) || 0)}
                        className="input text-lg font-serif font-bold"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <input
                        type="range"
                        value={correctedRate}
                        onChange={(e) => setCorrectedRate(parseFloat(e.target.value))}
                        className="w-full mt-2 accent-brand-600"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="label">修正原因</label>
                      <select
                        value={correctionReason}
                        onChange={(e) => setCorrectionReason(e.target.value)}
                        className="select"
                      >
                        <option value="">请选择原因</option>
                        <option value="调整判读阈值">调整判读阈值</option>
                        <option value="排除非特异性染色">排除非特异性染色</option>
                        <option value="补充遗漏细胞">补充遗漏细胞</option>
                        <option value="排除坏死区域">排除坏死区域</option>
                        <option value="区分免疫细胞染色">区分免疫细胞染色</option>
                        <option value="其他">其他原因</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">备注说明</label>
                      <textarea
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        className="textarea h-24"
                        placeholder="请详细说明修正依据..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-6">
                    <button
                      onClick={() => setShowCorrection(false)}
                      className="btn-secondary"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveCorrection}
                      className="btn-primary"
                      disabled={!correctionReason}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存修正
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                版本对比
              </h3>
              {versions.length >= 2 ? (
                <div className="grid grid-cols-2 gap-4">
                  {versions.slice(0, 2).map((ver, idx) => (
                    <div
                      key={ver.id}
                      className={cn(
                        'p-4 rounded-lg border-2',
                        idx === 0
                          ? 'border-accent-300 bg-accent-50/50'
                          : 'border-slate-200 bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-slate-800">
                          v{ver.version}
                        </span>
                        {idx === 0 && (
                          <span className="badge badge-success">最新</span>
                        )}
                      </div>
                      <p className="text-2xl font-serif font-bold text-slate-900">
                        {ver.positiveRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {ver.estimatedBy === 'ai'
                          ? 'AI估算'
                          : ver.estimatedBy === 'human'
                          ? '人工修正'
                          : '混合模式'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">
                  版本不足，无法对比
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">
                  <Settings2 className="w-4 h-4 inline mr-2 text-slate-500" />
                  估算参数
                </h3>
                <button className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  高级设置
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">算法版本</label>
                  <select
                    value={selectedAlgorithm}
                    onChange={(e) => setSelectedAlgorithm(e.target.value)}
                    className="select"
                    disabled={isRunning}
                  >
                    <option>IHC-AI-Pro v2.1.0</option>
                    <option>IHC-AI-Pro v2.0.5</option>
                    <option>IHC-Classic v1.5.0</option>
                  </select>
                </div>

                <div>
                  <label className="label">阳性判读阈值</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['weak', 'moderate', 'strong'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setThreshold(level)}
                        className={cn(
                          'py-2 px-3 text-xs font-medium rounded-md border transition-colors',
                          threshold === level
                            ? 'bg-brand-50 border-brand-300 text-brand-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                        disabled={isRunning}
                      >
                        {level === 'weak'
                          ? '弱 +'
                          : level === 'moderate'
                          ? '中 ++'
                          : '强 +++'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">ROI选择方式</label>
                  <select className="select" disabled={isRunning}>
                    <option>自动选择</option>
                    <option>手动标注</option>
                    <option>全片分析</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                版本历史
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
                {versions.length > 0 ? (
                  versions.map((ver, idx) => (
                    <div
                      key={ver.id}
                      className={cn(
                        'p-3 rounded-lg border transition-colors cursor-pointer',
                        idx === 0
                          ? 'bg-accent-50 border-accent-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            v{ver.version}
                          </span>
                          <span className="text-xs text-slate-400">
                            {ver.positiveRate.toFixed(1)}%
                          </span>
                        </div>
                        {idx === 0 && <CheckCircle2 className="w-4 h-4 text-accent-500" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(ver.estimatedAt), 'MM-dd HH:mm')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">
                    暂无版本记录
                  </p>
                )}
              </div>
            </div>

            <div className="card p-5 bg-gradient-to-br from-warning-50 to-white">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-slate-900">注意事项</h4>
                  <ul className="mt-2 text-xs text-slate-600 space-y-1">
                    <li className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-warning-400" />
                      AI结果仅供参考，需人工复核
                    </li>
                    <li className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-warning-400" />
                      弱染色样本可能存在误差
                    </li>
                    <li className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-warning-400" />
                      异常样本请走异常处理流程
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
