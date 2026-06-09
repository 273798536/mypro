import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Clock, Circle, HelpCircle } from 'lucide-react';
import type { AlignmentStep } from '@/types';
import { cn } from '@/lib/utils';

interface AlignmentTimelineProps {
  steps: AlignmentStep[];
}

export function AlignmentTimeline({ steps }: AlignmentTimelineProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-lab-100" />
      <ol className="space-y-1">
        {steps.map((step, idx) => {
          const isOpen = expanded[step.id] ?? (step.stepOrder === 1);
          return (
            <li
              key={step.id}
              className={cn(
                'relative opacity-0 animate-slide-in',
                `stagger-${Math.min(idx + 1, 6)}`,
              )}
              style={{ animationFillMode: 'forwards' }}
            >
              <button
                onClick={() => toggle(step.id)}
                className="w-full text-left group"
              >
                <div className="flex items-start gap-3 pl-2 pr-3 py-2.5 rounded-lg hover:bg-lab-50/60 transition-colors">
                  <div className="relative z-10 mt-0.5">
                    {step.isCompleted ? (
                      <div className="w-7 h-7 rounded-full bg-success-500 flex items-center justify-center shadow-soft">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : step.stepOrder === 1 ? (
                      <div className="w-7 h-7 rounded-full bg-info-500 flex items-center justify-center shadow-soft animate-pulse-slow">
                        <Clock className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-lab-200 flex items-center justify-center">
                        {step.description ? (
                          <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <Circle className="w-2 h-2 text-zinc-300" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400">Step {step.stepOrder}</span>
                        <h4 className="font-medium text-lab-800">{step.stepName}</h4>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </button>
              {isOpen && step.explanation && (
                <div className="ml-12 mr-4 mb-2 mt-1 pl-4 border-l-2 border-lab-200 py-2">
                  <div className="text-xs uppercase tracking-wide text-lab-500 font-semibold mb-1 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-lab-400" />
                    教学解释
                  </div>
                  <p className="text-sm text-lab-700 leading-relaxed bg-lab-50/60 p-3 rounded-md border border-lab-100/60">
                    {step.explanation}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default AlignmentTimeline;
