import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

export type StepStatus = 'pending' | 'current' | 'completed' | 'error';

interface Step {
  label: string;
  description?: string;
  status: StepStatus;
}

interface StepIndicatorProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const statusConfig: Record<
  StepStatus,
  {
    iconColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    lineColor: string;
  }
> = {
  pending: {
    iconColor: 'text-slate-400',
    bgColor: 'bg-white dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-600',
    textColor: 'text-slate-500 dark:text-slate-400',
    lineColor: 'bg-slate-200 dark:bg-slate-700',
  },
  current: {
    iconColor: 'text-white',
    bgColor: 'bg-primary-700',
    borderColor: 'border-primary-700',
    textColor: 'text-primary-700 dark:text-primary-400',
    lineColor: 'bg-primary-200 dark:bg-primary-800',
  },
  completed: {
    iconColor: 'text-white',
    bgColor: 'bg-green-600',
    borderColor: 'border-green-600',
    textColor: 'text-green-700 dark:text-green-400',
    lineColor: 'bg-green-500',
  },
  error: {
    iconColor: 'text-white',
    bgColor: 'bg-red-600',
    borderColor: 'border-red-600',
    textColor: 'text-red-700 dark:text-red-400',
    lineColor: 'bg-red-200 dark:bg-red-900',
  },
};

export default function StepIndicator({
  steps,
  orientation = 'horizontal',
  className,
}: StepIndicatorProps) {
  return (
    <div
      className={cn(
        orientation === 'horizontal'
          ? 'flex items-start justify-between w-full'
          : 'flex flex-col gap-0',
        className
      )}
    >
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const isLast = index === steps.length - 1;

        return (
          <div
            key={index}
            className={cn(
              'relative flex',
              orientation === 'horizontal'
                ? 'flex-1 flex-col items-center'
                : 'flex-row items-start'
            )}
          >
            {orientation === 'horizontal' ? (
              <>
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0',
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    {step.status === 'completed' || step.status === 'error' ? (
                      <Check className={cn('w-4 h-4', config.iconColor)} />
                    ) : step.status === 'current' ? (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    ) : (
                      <Circle className={cn('w-4 h-4', config.iconColor)} />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2',
                        steps[index + 1]?.status === 'completed' ||
                        step.status === 'completed'
                          ? statusConfig.completed.lineColor
                          : config.lineColor
                      )}
                    />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      config.textColor
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={cn(
                      'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0',
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    {step.status === 'completed' || step.status === 'error' ? (
                      <Check className={cn('w-4 h-4', config.iconColor)} />
                    ) : step.status === 'current' ? (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    ) : (
                      <Circle className={cn('w-4 h-4', config.iconColor)} />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 min-h-[40px] my-1',
                        steps[index + 1]?.status === 'completed' ||
                        step.status === 'completed'
                          ? statusConfig.completed.lineColor
                          : config.lineColor
                      )}
                    />
                  )}
                </div>
                <div className="pb-6">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      config.textColor
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
