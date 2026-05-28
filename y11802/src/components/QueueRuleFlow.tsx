import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { RedemptionRequest, SettlementStep } from '@/types';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import { formatDate, formatAmount } from '@/utils/formatters';

interface QueueRuleFlowProps {
  redemption: RedemptionRequest;
}

export default function QueueRuleFlow({ redemption }: QueueRuleFlowProps) {
  const { settlementSteps, traceRecords } = useRedemptionStore();
  const steps = settlementSteps
    .filter(s => s.requestId === redemption.id)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const traces = traceRecords.filter(t => t.requestId === redemption.id);

  const getStepIcon = (step: SettlementStep) => {
    if (step.stepStatus === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    if (step.stepStatus === 'blocked') {
      return <AlertCircle className="w-5 h-5 text-amber-400" />;
    }
    return <Circle className="w-5 h-5 text-slate-500" />;
  };

  const getStepBg = (step: SettlementStep) => {
    if (step.stepStatus === 'completed') return 'bg-emerald-500/20 border-emerald-500/30';
    if (step.stepStatus === 'blocked') return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-slate-700/50 border-slate-600/30';
  };

  const getStepText = (step: SettlementStep) => {
    if (step.stepStatus === 'completed') return 'text-emerald-300';
    if (step.stepStatus === 'blocked') return 'text-amber-300';
    return 'text-slate-400';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700">
        <h3 className="font-semibold text-white">排队规则主线</h3>
        <p className="text-xs text-slate-400 mt-1">赎回编号 {redemption.id} · {redemption.customerName}</p>
      </div>

      <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400 text-xs">申请份额</p>
            <p className="font-mono text-white font-semibold">{formatAmount(redemption.requestAmount)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">确认份额</p>
            <p className={`font-mono font-semibold ${redemption.confirmedAmount < redemption.requestAmount ? 'text-amber-400' : 'text-emerald-400'}`}>
              {redemption.confirmedAmount > 0 ? formatAmount(redemption.confirmedAmount) : '待确认'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">申请日期</p>
            <p className="font-mono text-white">{formatDate(redemption.applyDate)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">预计到账</p>
            <p className={`font-mono ${redemption.isDelayed ? 'text-amber-400' : 'text-white'}`}>
              {formatDate(redemption.expectedSettlementDate)}
              {redemption.isDelayed && ' (顺延)'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-5">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">清算流程</h4>
          <div className="relative">
            {steps.map((step, index) => (
              <div key={step.id} className="relative pl-8 pb-5 last:pb-0">
                {index < steps.length - 1 && (
                  <div className={`absolute left-2.5 top-6 w-0.5 h-full ${
                    step.stepStatus === 'completed' ? 'bg-emerald-500/30' : 'bg-slate-600/30'
                  }`} />
                )}
                <div className="absolute left-0 top-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${getStepBg(step)}`}>
                    {getStepIcon(step)}
                  </div>
                </div>
                <div className={`text-sm font-medium ${getStepText(step)}`}>
                  {step.stepName}
                </div>
                {step.blockedReason && (
                  <div className="mt-1.5 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <p className="text-xs text-amber-300 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {step.blockedReason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-3">辅助解释</h4>
          <div className="space-y-2.5">
            {traces.length > 0 ? (
              traces.map(trace => (
                <div key={trace.id} className="p-2.5 bg-slate-800 rounded-md border border-slate-700">
                  <p className="text-xs text-slate-300">{trace.conclusion}</p>
                  <p className="text-xs text-slate-500 mt-1">{trace.source}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">暂无辅助解释</p>
            )}
          </div>
        </div>

        {redemption.isDelayed && redemption.delayReason && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-300">清算日顺延说明</p>
                  <p className="text-xs text-amber-200/80 mt-1">{redemption.delayReason}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
