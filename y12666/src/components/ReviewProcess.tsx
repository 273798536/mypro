import { useState } from 'react';
import {
  Repeat,
  FileEdit,
  PenTool,
  Check,
  ChevronRight,
  User,
  MessageSquare,
  Play,
  X,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { Signature } from './Signature';

const stepLabels: Record<string, { label: string; icon: any; desc: string }> = {
  REPEAT_RUN: {
    label: '重复运行',
    icon: Repeat,
    desc: '多次重算验证结果稳定性',
  },
  SUPPLEMENT: {
    label: '补录',
    icon: FileEdit,
    desc: '补充缺失的工程字段',
  },
  CONFIRM: {
    label: '人工确认',
    icon: PenTool,
    desc: '评审员签字确认',
  },
};

export default function ReviewProcess() {
  const reviewSteps = useProjectStore((s) => s.reviewSteps);
  const setShowSupplementModal = useProjectStore((s) => s.setShowSupplementModal);
  const setShowSignatureModal = useProjectStore((s) => s.setShowSignatureModal);
  const wakeResults = useProjectStore((s) => s.wakeResults);
  const recalculateWake = useProjectStore((s) => s.recalculateWake);
  const resetAll = useProjectStore((s) => s.resetAll);
  const completeRepeatRun = useProjectStore((s) => s.completeRepeatRun);

  const [runCount, setRunCount] = useState(0);
  const [runResults, setRunResults] = useState<number[]>([]);
  const [operator, setOperator] = useState('工程评审员');
  const [comment, setComment] = useState('');

  const orderedSteps = ['REPEAT_RUN', 'SUPPLEMENT', 'CONFIRM'];

  const runRepeat = () => {
    recalculateWake();
    const avgLoss =
      wakeResults.reduce((s, r) => s + r.wakeLossPercent, 0) /
      Math.max(1, wakeResults.length);
    const jitter = (Math.random() - 0.5) * 0.8;
    const newResult = Math.max(0, avgLoss + jitter);
    setRunCount(runCount + 1);
    setRunResults([...runResults, newResult]);
  };

  const finishRepeat = () => {
    if (runCount < 3) {
      alert('重复运行至少需要 3 次');
      return;
    }
    completeRepeatRun(runCount, operator, comment || `完成 ${runCount} 次重复运行，结果偏差在可接受范围`);
    setShowSupplementModal(true);
  };

  const allCompleted = reviewSteps.every((s) => s.completed);

  const exportReport = () => {
    const data = {
      steps: reviewSteps,
      runResults,
      exportTime: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '评审报告.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-engineering text-sm text-sea-mist font-semibold flex items-center gap-2">
          <Check size={16} className="text-wake-teal" />
          评审流程
        </span>
        {allCompleted && (
          <span className="text-[10px] text-wake-teal flex items-center gap-1">
            <Check size={12} />
            全部完成
          </span>
        )}
      </div>

      <div className="flex items-stretch gap-0 mb-4">
        {orderedSteps.map((stepType, idx) => {
          const step = reviewSteps.find((s) => s.stepType === stepType)!;
          const info = stepLabels[stepType];
          const Icon = info.icon;
          const isActive = !step.completed && (idx === 0 || reviewSteps.find(s => s.stepType === orderedSteps[idx - 1])?.completed);

          return (
            <div key={stepType} className="flex items-stretch flex-1">
              <div
                className={`flex-1 flex flex-col items-center p-2 rounded border transition-all cursor-pointer ${
                  step.completed
                    ? 'bg-wake-teal/15 border-wake-teal/50'
                    : isActive
                    ? 'bg-ocean-slate/60 border-wake-teal/40 animate-pulse-slow'
                    : 'bg-ocean-slate/30 border-ocean-slate/50 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (!isActive && !step.completed) return;
                  if (stepType === 'REPEAT_RUN' && !step.completed) {
                    // inline action
                  } else if (stepType === 'SUPPLEMENT') {
                    if (reviewSteps.find(s => s.stepType === 'REPEAT_RUN')?.completed || step.completed) {
                      setShowSupplementModal(true);
                    }
                  } else if (stepType === 'CONFIRM') {
                    if (reviewSteps.find(s => s.stepType === 'SUPPLEMENT')?.completed || step.completed) {
                      setShowSignatureModal(true);
                    }
                  }
                }}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 ${
                    step.completed
                      ? 'bg-wake-teal text-deep-sea'
                      : isActive
                      ? 'bg-ocean-slate border-2 border-wake-teal text-sea-mist'
                      : 'bg-ocean-slate/50 text-sea-mist/50'
                  }`}
                >
                  {step.completed ? <Check size={14} strokeWidth={3} /> : <Icon size={13} />}
                </div>
                <span className={`text-[10px] font-engineering font-semibold ${step.completed ? 'text-wake-teal' : 'text-sea-mist/80'}`}>
                  {info.label}
                </span>
                {step.completed && step.completedAt && (
                  <span className="text-[9px] text-sea-mist/50 mt-0.5">
                    {step.operator}
                  </span>
                )}
              </div>
              {idx < orderedSteps.length - 1 && (
                <div className="flex items-center px-1">
                  <ChevronRight
                    size={14}
                    className={
                      reviewSteps.find(s => s.stepType === stepType)?.completed
                        ? 'text-wake-teal'
                        : 'text-sea-mist/30'
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!reviewSteps.find(s => s.stepType === 'REPEAT_RUN')?.completed && (
        <div className="space-y-3 p-3 rounded bg-ocean-slate/40 border border-wake-teal/20">
          <div className="text-xs text-sea-mist/80 font-semibold flex items-center gap-1.5">
            <Repeat size={12} className="text-wake-teal" />
            步骤一：重复运行验证（至少 3 次）
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-sea-mist/50" />
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="flex-1 bg-ocean-slate/60 border border-wake-teal/20 rounded px-2 py-1 text-xs text-sea-mist focus:outline-none focus:border-wake-teal"
                placeholder="操作人"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-ocean-slate/60 rounded px-2 py-1 border border-wake-teal/20">
              <RefreshCw size={12} className="text-wake-teal" />
              <span className="text-xs text-sea-mist font-engineering">
                已运行: {runCount} 次
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={runRepeat} className="btn-secondary !py-1.5 text-xs flex items-center gap-1.5 flex-1">
              <Play size={12} />
              运行一次
            </button>
            <button
              onClick={finishRepeat}
              disabled={runCount < 3}
              className="btn-primary !py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              完成本步骤
            </button>
          </div>
          {runResults.length > 0 && (
            <div className="text-[10px] text-sea-mist/60 font-engineering">
              平均尾流损失: {runResults.map(r => r.toFixed(2) + '%').join(', ')}
            </div>
          )}
        </div>
      )}

      {allCompleted && (
        <div className="space-y-2 mt-3">
          <div className="p-2.5 rounded bg-wake-teal/15 border border-wake-teal/40">
            <div className="text-xs text-wake-teal font-semibold mb-1 flex items-center gap-1">
              <Check size={12} />
              评审流程全部完成
            </div>
            <div className="text-[10px] text-sea-mist/60">
              可导出完整评审报告
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportReport} className="btn-primary !py-1.5 text-xs flex items-center gap-1.5 flex-1">
              <Download size={12} />
              导出评审报告
            </button>
            <button onClick={resetAll} className="btn-secondary !py-1.5 text-xs flex items-center gap-1.5">
              <X size={12} />
              重置
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
