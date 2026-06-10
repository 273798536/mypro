import { Check, Loader2, X, Circle, Play, RotateCcw } from 'lucide-react';
import type { QcStep, QcStepStatus } from '@/types';

interface QcStepsProps {
  steps: QcStep[];
  onRunStep: (stepId: string) => void;
  onRunAll: () => void;
  onReset: () => void;
}

const statusConfig: Record<QcStepStatus, { color: string; icon: typeof Circle; label: string }> = {
  pending: { color: 'text-warm-400 bg-warm-100 border-warm-200', icon: Circle, label: '未开始' },
  running: { color: 'text-teal-700 bg-teal-50 border-teal-200 animate-pulse-soft', icon: Loader2, label: '运行中' },
  passed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: Check, label: '通过' },
  failed: { color: 'text-rose-700 bg-rose-50 border-rose-200', icon: X, label: '未通过' },
};

export default function QcSteps({ steps, onRunStep, onRunAll, onReset }: QcStepsProps) {
  const allPassed = steps.every((s) => s.status === 'passed');
  const anyRunning = steps.some((s) => s.status === 'running');

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-warm-900">质控三步流程</h3>
          <p className="text-sm text-warm-500 mt-0.5">
            给质控组审核前，重复运行、补录、人工确认三件事都要完成
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            disabled={anyRunning}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            重置
          </button>
          <button
            onClick={onRunAll}
            disabled={anyRunning}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play size={14} />
            一键运行全部
          </button>
        </div>
      </div>

      {allPassed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check size={20} className="text-emerald-700" />
          </div>
          <div>
            <p className="font-medium text-emerald-800">全部质控步骤已通过</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              该报告已完成三步质控，可以提交给质控组审核
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {steps.map((step, idx) => {
          const config = statusConfig[step.status];
          const Icon = config.icon;
          return (
            <div
              key={step.id}
              className={`card p-5 transition-all duration-300 stagger-${idx + 1} animate-fade-in-up`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-900 text-white flex items-center justify-center font-serif text-sm font-semibold">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-medium text-warm-900">{step.name}</h4>
                    <span className={`badge ${config.color} gap-1 mt-1`}>
                      <Icon size={12} className={step.status === 'running' ? 'animate-spin' : ''} />
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-warm-600 mb-4 leading-relaxed">{step.description}</p>

              {step.resultDetail && (
                <div className="bg-warm-50 rounded-lg p-3 mb-4 max-h-32 overflow-auto scrollbar-thin">
                  <pre className="text-xs text-warm-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {step.resultDetail}
                  </pre>
                </div>
              )}

              <button
                onClick={() => onRunStep(step.id)}
                disabled={step.status === 'running' || step.status === 'passed'}
                className="w-full btn-secondary disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {step.status === 'running' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    运行中...
                  </>
                ) : step.status === 'passed' ? (
                  <>
                    <Check size={14} />
                    已完成
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    执行本步
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
