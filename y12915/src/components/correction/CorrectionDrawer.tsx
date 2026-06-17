import { useState, useEffect } from 'react';
import type { EvaluationSample } from '@/types';
import { cn } from '@/lib/utils';
import { X, Save, RotateCcw } from 'lucide-react';

interface CorrectionDrawerProps {
  open: boolean;
  onClose: () => void;
  sample: EvaluationSample | null;
  onSubmit: (sampleId: string, newScore: number, reason: string) => void;
}

const REASON_OPTIONS = [
  { value: '评分边界', label: '评分边界' },
  { value: '图像模糊', label: '图像模糊' },
  { value: '标注错误', label: '标注错误' },
  { value: '语义歧义', label: '语义歧义' },
  { value: '其他', label: '其他（自定义）' },
];

export default function CorrectionDrawer({
  open,
  onClose,
  sample,
  onSubmit,
}: CorrectionDrawerProps) {
  const [score, setScore] = useState(50);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [operator, setOperator] = useState('数据标注负责人');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sample) {
      setScore(sample.humanCorrectedScore ?? sample.modelScore);
      setReason('');
      setCustomReason('');
    }
  }, [sample]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !sample) return null;

  const modelScore = sample.modelScore;
  const scoreDiff = score - modelScore;
  const finalReason = reason === '其他' ? customReason : reason;

  function handleSubmit() {
    if (!finalReason.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      onSubmit(sample.id, score, finalReason);
      setSubmitting(false);
      onClose();
    }, 300);
  }

  function handleReset() {
    setScore(modelScore);
    setReason('');
    setCustomReason('');
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className={cn(
        'relative w-full max-w-md h-full bg-slate-900 border-l border-slate-700 shadow-2xl',
        'flex flex-col overflow-hidden transition-transform'
      )}>
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">修正评分</div>
            <h2 className="text-xl font-bold text-slate-100 mt-0.5">
              #{sample.originalRowNumber}
              <span className="ml-2 text-sm font-normal text-slate-400 font-mono">
                {sample.imageName ?? sample.id}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {sample.imageUrl && (
            <div>
              <div className="text-xs text-slate-500 mb-2">图片预览</div>
              <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-800/40" style={{ height: 200 }}>
                <img
                  src={sample.imageUrl}
                  alt={sample.imageName ?? 'preview'}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div className="text-xs text-slate-500 mb-1">原始模型分</div>
              <div className="text-2xl font-bold font-mono text-slate-300">
                {modelScore.toFixed(1)}
              </div>
            </div>
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
              <div className="text-xs text-sky-400 mb-1">当前修正分</div>
              <div className="text-2xl font-bold font-mono text-sky-300">
                {score.toFixed(1)}
              </div>
              <div className={cn(
                'text-xs mt-0.5 font-mono',
                scoreDiff > 0 ? 'text-emerald-400' : scoreDiff < 0 ? 'text-rose-400' : 'text-slate-500'
              )}>
                {scoreDiff > 0 ? '↑' : scoreDiff < 0 ? '↓' : '→'}
                {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-200">分数滑块</div>
              <div className="text-xs text-slate-500 font-mono">0 - 100</div>
            </div>
            <div className="space-y-3">
              <div className="relative px-2">
                <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="relative w-full appearance-none bg-transparent h-10 cursor-pointer z-10
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-sky-500
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:active:cursor-grabbing
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono px-2">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-200 mb-3">修正理由</div>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setReason(opt.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm border transition-all text-left',
                    reason === opt.value
                      ? 'bg-sky-600/20 text-sky-300 border-sky-500/50'
                      : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {reason === '其他' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="请输入自定义理由..."
                className="mt-3 w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
              />
            )}
          </div>

          <div>
            <div className="text-sm font-medium text-slate-200 mb-3">操作人</div>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
            />
          </div>

          {sample.correctionReason && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="text-xs text-amber-400 font-semibold mb-1">历史修正记录</div>
              <div className="text-sm text-slate-300">
                <span className="text-slate-500">理由：</span>{sample.correctionReason}
              </div>
              {sample.correctedBy && (
                <div className="text-sm text-slate-300 mt-1">
                  <span className="text-slate-500">操作人：</span>{sample.correctedBy}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/80 flex items-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-700/60 border border-slate-600 hover:bg-slate-700 transition-colors"
          >
            <RotateCcw size={14} />
            重置
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!finalReason.trim() || submitting}
            className={cn(
              'inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all',
              finalReason.trim() && !submitting
                ? 'bg-sky-600 text-white hover:bg-sky-500 shadow-sm hover:shadow-sky-500/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            )}
          >
            <Save size={14} />
            {submitting ? '提交中...' : '提交修正'}
          </button>
        </div>
      </div>
    </div>
  );
}
