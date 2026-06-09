import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CalculationStep } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  steps: CalculationStep[];
}

export default function CalculationPanel({ steps }: Props) {
  const { highlightedRefId, setHighlightedRefId } = useAppStore();

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-lab-blue font-semibold flex items-center gap-2 mb-4">
        <span className="w-1 h-6 bg-lab-blue rounded-full" />
        配平计算复核
      </h3>

      {steps.map((step) => {
        const isHighlighted = highlightedRefId === String(step.step);
        return (
          <details
            key={step.step}
            open={step.step <= 2 || step.hasIssue}
            className={`group rounded-sm-plus border transition-all ${
              step.hasIssue
                ? 'border-lab-red/50 bg-lab-red/5'
                : 'border-paper-dark bg-white hover:border-lab-blue/30'
            } ${isHighlighted ? 'ring-2 ring-lab-yellow ring-offset-2' : ''}`}
            onMouseEnter={() => setHighlightedRefId(String(step.step))}
            onMouseLeave={() => setHighlightedRefId(null)}
          >
            <summary className="flex items-center gap-3 p-4">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step.hasIssue
                    ? 'bg-lab-red text-white'
                    : 'bg-lab-green/15 text-lab-green'
                }`}
              >
                {step.hasIssue ? <AlertCircle size={16} /> : step.step}
              </span>

              <div className="flex-1">
                <div className="font-medium text-gray-800 flex items-center gap-2">
                  {step.title}
                  {step.hasIssue ? (
                    <span className="text-xs text-lab-red font-semibold">存在问题</span>
                  ) : (
                    <CheckCircle2 size={14} className="text-lab-green" />
                  )}
                </div>
                <div className="font-mono-chem text-sm text-gray-600 mt-0.5">
                  {step.equation}
                </div>
              </div>

              <div className="font-mono-chem text-sm font-semibold text-lab-blue mr-2">
                {step.value}
              </div>

              <ChevronDown
                size={18}
                className="text-gray-400 group-open:rotate-180 transition-transform shrink-0"
              />
            </summary>

            <div className="px-4 pb-4 pt-0 ml-11">
              <div className="p-3 bg-paper rounded-sm-plus text-sm text-gray-600 leading-relaxed border-l-2 border-lab-blue/30">
                {step.explanation}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
