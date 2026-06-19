import { useState } from 'react';
import type { Step } from '@/types';
import { ChangeTypeBadge } from './StatusBadge';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, AlertCircle } from 'lucide-react';

interface StepTimelineProps {
  steps: Step[];
  showStepNotes?: (stepId: string) => React.ReactNode;
}

const StepTimeline: React.FC<StepTimelineProps> = ({ steps, showStepNotes }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getStepIcon = (step: Step) => {
    if (step.changeType === 'none') {
      return <Circle className="w-4 h-4 text-slate-400" />;
    }
    if (step.changeType === 'added') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (step.changeType === 'removed') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="relative">
      <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-slate-200" />
      
      <div className="space-y-1">
        {steps.map((step, index) => {
          const isExpanded = expandedSteps.has(step.id);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="relative">
              <div
                className={`flex items-start gap-4 py-3 px-4 rounded-lg cursor-pointer transition-all hover:bg-slate-50 ${
                  step.hasChange ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => toggleStep(step.id)}
              >
                <div className="relative z-10 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
                    {getStepIcon(step)}
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                    {step.stepIndex}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-slate-900">{step.stepName}</h4>
                    {step.hasChange && <ChangeTypeBadge type={step.changeType} />}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>
                  {step.changeDetail && step.hasChange && (
                    <p className="text-sm text-blue-600 mt-1 font-medium">{step.changeDetail}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-1">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              
              {isExpanded && (
                <div className="ml-14 mt-1 mb-3 pl-4 border-l-2 border-slate-200">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-slate-700 mb-3">参数配置</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(step.parameters).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-xs text-slate-500 font-mono min-w-[100px]">{key}:</span>
                          <span className="text-xs text-slate-700 font-mono break-all">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {showStepNotes && showStepNotes(step.id)}
                  </div>
                </div>
              )}
              
              {!isLast && <div className="absolute left-5 top-12 w-0.5 h-4 bg-slate-200" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepTimeline;
