import { Clock, User, Bot, ArrowRight } from 'lucide-react';
import { CleanStep } from '@/types';
import { cn } from '@/lib/utils';

interface TraceTimelineProps {
  steps: CleanStep[];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function TraceTimeline({ steps }: TraceTimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-5 top-2 bottom-2 w-0.5 overflow-hidden">
        <div className="h-full w-full">
          <svg className="h-full w-full" preserveAspectRatio="none">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100%"
              stroke="#00B8D4"
              strokeWidth="2"
              strokeDasharray="8 4"
              className="animate-flow"
              style={{ strokeDashoffset: '1000' }}
            />
          </svg>
        </div>
      </div>

      <ul className="space-y-6">
        {steps.map((step, index) => {
          const isSystem = step.operator === 'system';
          const dotColor = isSystem ? 'bg-ocean' : 'bg-data-gold';
          const ringColor = isSystem ? 'ring-ocean/30' : 'ring-data-gold/30';
          const iconBg = isSystem ? 'bg-ocean/10 text-ocean' : 'bg-data-gold/10 text-data-gold';

          return (
            <li key={index} className="relative pl-16">
              <div
                className={cn(
                  'absolute left-3 top-1 flex h-5 w-5 items-center justify-center rounded-full ring-4',
                  dotColor,
                  ringColor
                )}
              >
                <span className={cn('h-2 w-2 rounded-full bg-white')} />
              </div>

              <div className="rounded-xl border border-sea-gray-dark/30 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold',
                        iconBg
                      )}
                    >
                      {isSystem ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      {step.step}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-medium',
                        isSystem
                          ? 'bg-ocean/10 text-ocean'
                          : 'bg-data-gold/10 text-data-gold'
                      )}
                    >
                      {isSystem ? '系统操作' : '用户操作'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-sea-gray-dark">
                    <Clock className="h-4 w-4" />
                    {step.timestamp}
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-3 rounded-lg bg-sea-gray/50 p-3">
                  <div className="flex-1">
                    <div className="mb-1 text-xs font-medium text-sea-gray-dark">变更前</div>
                    <div className="font-mono text-sm text-deep-sea">
                      {formatValue(step.before)}
                    </div>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ocean shadow-sm">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-xs font-medium text-sea-gray-dark">变更后</div>
                    <div className="font-mono text-sm text-ocean">
                      {formatValue(step.after)}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-deep-sea-light">
                  <span className="font-semibold">处理理由：</span>
                  {step.reason}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
