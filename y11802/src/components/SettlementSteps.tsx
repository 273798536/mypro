import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import type { SettlementStep } from '@/types';

interface SettlementStepsProps {
  requestId: string;
}

export default function SettlementSteps({ requestId }: SettlementStepsProps) {
  const { settlementSteps } = useRedemptionStore();
  const steps = settlementSteps
    .filter(s => s.requestId === requestId)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  if (steps.length === 0) {
    return <p className="text-sm text-slate-500 italic">暂无清算步骤</p>;
  }

  const getStepIcon = (step: SettlementStep) => {
    if (step.stepStatus === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    if (step.stepStatus === 'blocked') {
      return <AlertCircle className="w-5 h-5 text-amber-400" />;
    }
    return <Circle className="w-5 h-5 text-slate-500" />;
  };

  const getStepLineColor = (step: SettlementStep) => {
    if (step.stepStatus === 'completed') return 'bg-emerald-500/30';
    return 'bg-slate-700';
  };

  const getStepTextColor = (step: SettlementStep) => {
    if (step.stepStatus === 'completed') return 'text-emerald-300';
    if (step.stepStatus === 'blocked') return 'text-amber-300';
    return 'text-slate-400';
  };

  return (
    <div className="relative">
      {steps.map((step, index) => (
        <div key={step.id} className="relative pl-8 pb-5 last:pb-0">
          {index < steps.length - 1 && (
            <div className={`absolute left-2.5 top-6 w-0.5 h-full ${getStepLineColor(step)}`} />
          )}
          <div className="absolute left-0 top-0">
            {getStepIcon(step)}
          </div>
          <div className={`text-sm font-medium ${getStepTextColor(step)}`}>
            {step.stepName}
          </div>
          {step.blockedReason && (
            <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <p className="text-xs text-amber-300 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>卡点：</strong>{step.blockedReason}
                </span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
